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
  setCurrentOrganization: (org: Organization) => void;
  createOrganization: (name: string) => Promise<Organization | null>;
  refetch: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Check and accept any pending invitations for the user
  const checkPendingInvitations = async () => {
    if (!user?.email) return;

    try {
      // Find pending invitations for this email
      const { data: invitations, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("email", user.email.toLowerCase())
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString());

      if (error || !invitations?.length) return;

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
        }

        // Mark invitation as accepted
        await supabase
          .from("invitations")
          .update({ status: "accepted" })
          .eq("id", invite.id);
      }
    } catch (error) {
      console.error("Error processing pending invitations:", error);
    }
  };

  const fetchOrganizations = async () => {
    if (!user) {
      setOrganizations([]);
      setOrganization(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching organizations:", error);
      setLoading(false);
      return;
    }

    setOrganizations(data || []);
    
    // Set first org as current if none selected
    if (data && data.length > 0 && !organization) {
      setOrganization(data[0]);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      if (!user) {
        setOrganizations([]);
        setOrganization(null);
        setLoading(false);
        setHasInitialized(true);
        return;
      }

      setLoading(true);

      // First, process any pending invitations BEFORE fetching orgs
      await checkPendingInvitations();

      // Then fetch organizations (now includes newly joined ones)
      await fetchOrganizations();
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
        setCurrentOrganization,
        createOrganization,
        refetch: fetchOrganizations,
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
