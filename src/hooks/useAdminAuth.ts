import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface AdminUser {
  id: string;
  user_id: string;
  role: "super_admin" | "admin";
  created_at: string;
}

export const useAdminAuth = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAdminStatus = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setAdminUser(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setAdminUser(null);
      } else {
        setIsAdmin(true);
        setIsSuperAdmin(data.role === "super_admin");
        setAdminUser(data as AdminUser);
      }
    } catch (err) {
      console.error("Error checking admin status:", err);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setAdminUser(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      checkAdminStatus();
    }
  }, [authLoading, checkAdminStatus]);

  return {
    isAdmin,
    isSuperAdmin,
    adminUser,
    loading: authLoading || loading,
    refetch: checkAdminStatus,
  };
};
