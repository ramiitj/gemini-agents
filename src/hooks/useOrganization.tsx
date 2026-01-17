import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface OrganizationContextType {
  organization: Organization | null;
  organizations: Organization[];
  loading: boolean;
  hasInitialized: boolean;
  justJoinedViaInvite: boolean;
  setCurrentOrganization: (org: Organization) => void;
  createOrganization: (name: string) => Promise<Organization | null>;
  refetch: () => Promise<Organization[]>;
  clearJustJoinedFlag: () => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [justJoinedViaInvite, setJustJoinedViaInvite] = useState(false);

  // Check and accept any pending invitations for the user
  const checkPendingInvitations = async (): Promise<boolean> => {
    if (!user?.email) return false;

    try {
      // Find pending invitations for this email
      const { data: invitations, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("email", user.email.toLowerCase())
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString());

      if (error || !invitations?.length) return false;

      let acceptedAny = false;
      let invitedProjectId: string | null = null;

      // Accept each invitation
      for (const invite of invitations) {
        // Check if user already has a role in this org
        const { data: existingRole } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", user.id)
          .eq("organization_id", invite.organization_id)
          .single();

        if (!existingRole) {
          // Add user to organization with invited role
          await supabase.from("user_roles").insert({
            user_id: user.id,
            organization_id: invite.organization_id,
            role: invite.role as "owner" | "admin" | "editor" | "viewer",
            custom_role_id: invite.custom_role_id,
            custom_permissions: invite.custom_permissions,
          });
          acceptedAny = true;
        }

        // If invitation has a specific project, add user to project_members
        if (invite.project_id) {
          // Check if already a project member
          const { data: existingMember } = await supabase
            .from("project_members")
            .select("id")
            .eq("user_id", user.id)
            .eq("project_id", invite.project_id)
            .single();

          if (!existingMember) {
            // Add to project_members
            const { data: membership } = await supabase
              .from("project_members")
              .insert({
                project_id: invite.project_id,
                user_id: user.id,
                role: invite.role,
              })
              .select()
              .single();

            // Create user's personal branch
            try {
              const { data: branchResult } = await supabase.functions.invoke('create-user-branch', {
                body: { projectId: invite.project_id, userId: user.id }
              });

              // Update project_members with branch name
              if (branchResult?.branchName && membership) {
                await supabase
                  .from("project_members")
                  .update({ branch_name: branchResult.branchName })
                  .eq("id", membership.id);
              }
            } catch (branchError) {
              console.error("Error creating user branch:", branchError);
              // Continue even if branch creation fails
            }
          }

          // Store the project ID for auto-redirect
          invitedProjectId = invite.project_id;
        }

        // Mark invitation as accepted
        await supabase
          .from("invitations")
          .update({ status: "accepted" })
          .eq("id", invite.id);
      }
      
      // Store invited project ID for redirect after initialization
      if (invitedProjectId) {
        localStorage.setItem('invited_project_id', invitedProjectId);
      }
      
      return acceptedAny;
    } catch (error) {
      console.error("Error processing pending invitations:", error);
      return false;
    }
  };

  const clearJustJoinedFlag = () => {
    setJustJoinedViaInvite(false);
  };

  const fetchOrganizations = async (): Promise<Organization[]> => {
    if (!user) {
      setOrganizations([]);
      setOrganization(null);
      return [];
    }

    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching organizations:", error);
      return [];
    }

    const orgs = data || [];
    setOrganizations(orgs);
    
    // Set first org as current if none selected
    if (orgs.length > 0 && !organization) {
      setOrganization(orgs[0]);
    }
    
    return orgs;
  };

  useEffect(() => {
    // CRITICAL: Reset states when user changes to prevent flicker
    // hasInitialized must stay false until we complete the full fetch
    setHasInitialized(false);
    setLoading(true);

    const init = async () => {
      if (!user) {
        setOrganizations([]);
        setOrganization(null);
        setLoading(false);
        setHasInitialized(true);
        setJustJoinedViaInvite(false);
        return;
      }

      // First, process any pending invitations BEFORE fetching orgs
      const acceptedInvite = await checkPendingInvitations();
      
      // Set flag if user just joined via invite
      if (acceptedInvite) {
        setJustJoinedViaInvite(true);
      }

      // Then fetch organizations (now includes newly joined ones)
      // CRITICAL: Set hasInitialized AFTER orgs are fetched to prevent flicker
      await fetchOrganizations();
      
      // Only mark as initialized after we have the org data
      setLoading(false);
      setHasInitialized(true);
    };

    init();
  }, [user]);

  const setCurrentOrganization = (org: Organization) => {
    setOrganization(org);
  };

  const createOrganization = async (name: string): Promise<Organization | null> => {
    if (!user) return null;

    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name, slug, created_by: user.id })
      .select()
      .single();

    if (orgError) {
      console.error("Error creating organization:", orgError);
      return null;
    }

    // Add user as owner
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, organization_id: org.id, role: "owner" });

    if (roleError) {
      console.error("Error assigning role:", roleError);
    }

    await fetchOrganizations();
    setOrganization(org);
    return org;
  };

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        organizations,
        loading,
        hasInitialized,
        justJoinedViaInvite,
        setCurrentOrganization,
        createOrganization,
        refetch: fetchOrganizations,
        clearJustJoinedFlag,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
};
