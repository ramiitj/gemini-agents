import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
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
  const { toast } = useToast();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [justJoinedViaInvite, setJustJoinedViaInvite] = useState(false);
  // Check and accept any pending invitations for the user
  const checkPendingInvitations = async (): Promise<boolean> => {
    if (!user?.email) {
      console.log('[Invite] No user email, skipping invitation check');
      return false;
    }

    const normalizedEmail = user.email.toLowerCase().trim();
    console.log('[Invite] Checking pending invitations for:', normalizedEmail);

    try {
      // Find pending invitations for this email (case-insensitive matching handled by RLS)
      const { data: invitations, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString());

      if (error) {
        console.error('[Invite] Error fetching invitations:', error);
        return false;
      }

      console.log('[Invite] Found invitations:', invitations?.length || 0);
      
      if (!invitations?.length) return false;

      let acceptedAny = false;
      let invitedProjectId: string | null = null;

      // Accept each invitation
      for (const invite of invitations) {
        console.log('[Invite] Processing invite:', invite.id, 'for org:', invite.organization_id, 'project:', invite.project_id);
        
        // Check if user already has a role in this org
        const { data: existingRole } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", user.id)
          .eq("organization_id", invite.organization_id)
          .single();

        if (!existingRole) {
          // Add user to organization with invited role
          const { error: roleError } = await supabase.from("user_roles").insert({
            user_id: user.id,
            organization_id: invite.organization_id,
            role: invite.role as "owner" | "admin" | "editor" | "viewer",
            custom_role_id: invite.custom_role_id,
            custom_permissions: invite.custom_permissions,
          });
          
          if (roleError) {
            console.error('[Invite] Error inserting user_role:', roleError);
          } else {
            console.log('[Invite] User added to organization:', invite.organization_id);
            acceptedAny = true;
          }
        } else {
          console.log('[Invite] User already has role in org:', invite.organization_id);
          acceptedAny = true; // Still count as accepted for redirect purposes
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
            const { data: membership, error: memberError } = await supabase
              .from("project_members")
              .insert({
                project_id: invite.project_id,
                user_id: user.id,
                role: invite.role,
              })
              .select()
              .single();

            if (memberError) {
              console.error('[Invite] Error inserting project_member:', memberError);
            } else {
              console.log('[Invite] User added to project:', invite.project_id);
              
              // Create user's personal branch
              try {
                console.log('[Invite] Creating user branch for project:', invite.project_id);
                const { data: branchResult, error: branchError } = await supabase.functions.invoke('create-user-branch', {
                  body: { projectId: invite.project_id, userId: user.id }
                });

                if (branchError) {
                  console.error('[Invite] Branch creation error:', branchError);
                } else if (branchResult?.branchName && membership) {
                  console.log('[Invite] Branch created:', branchResult.branchName);
                  await supabase
                    .from("project_members")
                    .update({ branch_name: branchResult.branchName })
                    .eq("id", membership.id);
                }
              } catch (branchError) {
                console.error("[Invite] Error creating user branch:", branchError);
                // Continue even if branch creation fails
              }
            }
          } else {
            console.log('[Invite] User already member of project:', invite.project_id);
          }

          // Store the project ID for auto-redirect
          invitedProjectId = invite.project_id;
        }

        // Mark invitation as accepted
        const { error: updateError } = await supabase
          .from("invitations")
          .update({ status: "accepted" })
          .eq("id", invite.id);
          
        if (updateError) {
          console.error('[Invite] Error marking invitation as accepted:', updateError);
        } else {
          console.log('[Invite] Invitation marked as accepted:', invite.id);
        }
      }
      
      // Store invited project ID for redirect after initialization
      if (invitedProjectId) {
        console.log('[Invite] Setting invited_project_id for redirect:', invitedProjectId);
        localStorage.setItem('invited_project_id', invitedProjectId);
      }
      
      return acceptedAny;
    } catch (error) {
      console.error("[Invite] Error processing pending invitations:", error);
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
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a workspace",
        variant: "destructive",
      });
      return null;
    }

    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    
    console.log('[Org] Creating organization:', name, 'for user:', user.id);
    
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name, slug, created_by: user.id })
      .select()
      .single();

    if (orgError) {
      console.error("[Org] Error creating organization:", orgError);
      toast({
        title: "Error",
        description: orgError.message || "Failed to create workspace",
        variant: "destructive",
      });
      return null;
    }

    console.log('[Org] Organization created:', org.id);

    // Add user as owner
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, organization_id: org.id, role: "owner" });

    if (roleError) {
      console.error("[Org] Error assigning owner role:", roleError);
      toast({
        title: "Warning",
        description: "Workspace created but role assignment failed. Please try refreshing.",
        variant: "destructive",
      });
    } else {
      console.log('[Org] Owner role assigned successfully');
      toast({
        title: "Success",
        description: "Workspace created successfully!",
      });
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
