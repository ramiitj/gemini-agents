import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Permissions {
  projects: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  deployments: {
    view: boolean;
    trigger: boolean;
    manage: boolean;
  };
  team: {
    view: boolean;
    invite: boolean;
    manage: boolean;
    approve: boolean;  // Can approve/reject changes in team chat
    merge: boolean;    // Can merge to main branch
  };
  settings: {
    view: boolean;
    edit: boolean;
  };
  chat: {
    view: boolean;
    send: boolean;
    moderate: boolean;
  };
}

export interface CustomRole {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  permissions: Permissions;
  created_by: string | null;
  created_at: string;
}

export const DEFAULT_PERMISSIONS: Permissions = {
  projects: { view: true, create: false, edit: false, delete: false },
  deployments: { view: true, trigger: false, manage: false },
  team: { view: true, invite: false, manage: false, approve: false, merge: false },
  settings: { view: false, edit: false },
  chat: { view: true, send: true, moderate: false }
};

export const PRESET_PERMISSIONS: Record<string, Permissions> = {
  owner: {
    projects: { view: true, create: true, edit: true, delete: true },
    deployments: { view: true, trigger: true, manage: true },
    team: { view: true, invite: true, manage: true, approve: true, merge: true },
    settings: { view: true, edit: true },
    chat: { view: true, send: true, moderate: true }
  },
  admin: {
    projects: { view: true, create: true, edit: true, delete: true },
    deployments: { view: true, trigger: true, manage: true },
    team: { view: true, invite: true, manage: true, approve: true, merge: true },
    settings: { view: true, edit: true },
    chat: { view: true, send: true, moderate: true }
  },
  editor: {
    projects: { view: true, create: true, edit: true, delete: false },
    deployments: { view: true, trigger: true, manage: false },
    team: { view: true, invite: false, manage: false, approve: false, merge: false },
    settings: { view: true, edit: false },
    chat: { view: true, send: true, moderate: false }
  },
  viewer: {
    projects: { view: true, create: false, edit: false, delete: false },
    deployments: { view: true, trigger: false, manage: false },
    team: { view: true, invite: false, manage: false, approve: false, merge: false },
    settings: { view: false, edit: false },
    chat: { view: true, send: true, moderate: false }
  }
};

export const useCustomRoles = (organizationId: string | null) => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = useCallback(async () => {
    if (!organizationId) {
      setRoles([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("custom_roles")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name");

    if (error) {
      console.error("Error fetching custom roles:", error);
    } else {
      setRoles((data || []).map(r => ({
        ...r,
        permissions: r.permissions as unknown as Permissions
      })));
    }
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const createRole = useCallback(async (
    name: string,
    description: string,
    permissions: Permissions
  ): Promise<CustomRole | null> => {
    if (!organizationId || !user) return null;

    const { data, error } = await supabase
      .from("custom_roles")
      .insert([{
        organization_id: organizationId,
        name,
        description,
        permissions: JSON.parse(JSON.stringify(permissions)),
        created_by: user.id
      }])
      .select()
      .single();

    if (error) {
      console.error("Error creating role:", error);
      return null;
    }

    await fetchRoles();
    return { ...data, permissions: data.permissions as unknown as Permissions };
  }, [organizationId, user, fetchRoles]);

  const updateRole = useCallback(async (
    id: string,
    updates: Partial<Pick<CustomRole, "name" | "description" | "permissions">>
  ): Promise<boolean> => {
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.permissions !== undefined) updateData.permissions = updates.permissions;

    const { error } = await supabase
      .from("custom_roles")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("Error updating role:", error);
      return false;
    }

    await fetchRoles();
    return true;
  }, [fetchRoles]);

  const deleteRole = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from("custom_roles")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting role:", error);
      return false;
    }

    await fetchRoles();
    return true;
  }, [fetchRoles]);

  return {
    roles,
    loading,
    createRole,
    updateRole,
    deleteRole,
    refetch: fetchRoles
  };
};
