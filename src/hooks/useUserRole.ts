import { useState, useEffect, useCallback, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "owner" | "admin" | "editor" | "viewer";

interface UseUserRoleResult {
  role: AppRole | null;
  loading: boolean;
  canMerge: boolean; // owner or admin can merge to main
  canEdit: boolean;  // owner, admin, or editor can edit
  refetch: () => Promise<void>;
}

export function useUserRole(organizationId: string | null | undefined): UseUserRoleResult {
  // Safely get auth - will throw if not in AuthProvider
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async () => {
    if (!user || !organizationId) {
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", organizationId)
        .single();

      if (error) {
        console.error("Error fetching user role:", error);
        setRole(null);
      } else {
        setRole(data?.role as AppRole || null);
      }
    } catch (e) {
      console.error("Failed to fetch user role:", e);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, [user, organizationId]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  // Owner and admin can merge PRs to main
  const canMerge = role === "owner" || role === "admin";
  
  // Owner, admin, and editor can make changes
  const canEdit = role === "owner" || role === "admin" || role === "editor";

  return { role, loading, canMerge, canEdit, refetch: fetchRole };
}
