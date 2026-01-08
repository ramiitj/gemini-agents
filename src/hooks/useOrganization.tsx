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
    fetchOrganizations();
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
