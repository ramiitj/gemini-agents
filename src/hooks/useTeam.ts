import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface TeamMember {
  id: string;
  user_id: string;
  role: "owner" | "admin" | "editor" | "viewer";
  profile: {
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const useTeam = (organizationId: string | null) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const fetchTeam = async () => {
    if (!organizationId || !user) {
      setMembers([]);
      setLoading(false);
      return;
    }

    // Fetch user_roles first
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("id, user_id, role")
      .eq("organization_id", organizationId);

    if (rolesError) {
      console.error("Error fetching roles:", rolesError);
      setLoading(false);
      return;
    }

    // Then fetch profiles separately to avoid FK issues
    const userIds = roles?.map(r => r.user_id) || [];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url")
      .in("id", userIds);

    // Combine the data
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const formattedMembers: TeamMember[] = (roles || []).map((member) => ({
      id: member.id,
      user_id: member.user_id,
      role: member.role as "owner" | "admin" | "editor" | "viewer",
      profile: profileMap.get(member.user_id) || null,
    }));

    setMembers(formattedMembers);
    
    // Find current user's role
    const currentMember = formattedMembers.find(m => m.user_id === user.id);
    setCurrentUserRole(currentMember?.role || null);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchTeam();
  }, [organizationId, user]);

  const inviteMember = async (
    email: string, 
    role: "admin" | "editor" | "viewer",
    customRoleId?: string,
    customPermissions?: Record<string, unknown>
  ) => {
    if (!organizationId || !user) {
      return { success: false, message: 'Not authenticated' };
    }

    const insertData: Record<string, unknown> = {
      email,
      role,
      organization_id: organizationId,
      invited_by: user.id
    };

    // Add custom role data if provided
    if (customRoleId) {
      insertData.custom_role_id = customRoleId;
    }
    if (customPermissions) {
      insertData.custom_permissions = customPermissions;
    }

    const { data, error } = await supabase
      .from("invitations")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error creating invitation:", error);
      return { success: false, message: error.message };
    }

    // Generate invitation link
    const inviteLink = `${window.location.origin}/accept-invite/${data.token}`;
    
    return { 
      success: true, 
      message: `Invitation created for ${email}. Share this link: ${inviteLink}`, 
      inviteLink,
      data 
    };
  };

  const updateMemberRole = async (memberId: string, newRole: "admin" | "editor" | "viewer") => {
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("id", memberId);

    if (error) {
      console.error("Error updating role:", error);
      return false;
    }

    await fetchTeam();
    return true;
  };

  const removeMember = async (memberId: string) => {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("id", memberId);

    if (error) {
      console.error("Error removing member:", error);
      return false;
    }

    await fetchTeam();
    return true;
  };

  return {
    members,
    loading,
    currentUserRole,
    inviteMember,
    updateMemberRole,
    removeMember,
    refetch: fetchTeam,
  };
};
