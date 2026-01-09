import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Permissions, PRESET_PERMISSIONS, DEFAULT_PERMISSIONS } from "./useCustomRoles";

export const usePermissions = (organizationId: string | null) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Permissions>(DEFAULT_PERMISSIONS);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!organizationId || !user) {
      setPermissions(DEFAULT_PERMISSIONS);
      setLoading(false);
      return;
    }

    // Get user's role in this organization
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role, custom_role_id, custom_permissions")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .single();

    if (!userRole) {
      setPermissions(DEFAULT_PERMISSIONS);
      setLoading(false);
      return;
    }

    setRole(userRole.role);

    // If user has custom permissions override
    if (userRole.custom_permissions) {
      setPermissions(userRole.custom_permissions as unknown as Permissions);
      setLoading(false);
      return;
    }

    // If user has a custom role
    if (userRole.custom_role_id) {
      const { data: customRole } = await supabase
        .from("custom_roles")
        .select("permissions")
        .eq("id", userRole.custom_role_id)
        .single();

      if (customRole?.permissions) {
        setPermissions(customRole.permissions as unknown as Permissions);
        setLoading(false);
        return;
      }
    }

    // Fall back to preset role permissions
    const presetPerms = PRESET_PERMISSIONS[userRole.role];
    setPermissions(presetPerms || DEFAULT_PERMISSIONS);
    setLoading(false);
  }, [organizationId, user]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const can = useCallback((category: keyof Permissions, action: string): boolean => {
    const categoryPerms = permissions[category];
    if (!categoryPerms) return false;
    return (categoryPerms as Record<string, boolean>)[action] ?? false;
  }, [permissions]);

  const isOwner = role === "owner";
  const isAdmin = role === "admin" || isOwner;

  return {
    permissions,
    role,
    loading,
    can,
    isOwner,
    isAdmin,
    refetch: fetchPermissions
  };
};
