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

    const { data, error } = await supabase
      .from("user_roles")
      .select(`
        id,
        user_id,
        role,
        profiles:user_id (
          email,
          full_name,
          avatar_url
        )
      `)
      .eq("organization_id", organizationId);

    if (error) {
      console.error("Error fetching team:", error);
      setLoading(false);
      return;
    }

    const formattedMembers: TeamMember[] = (data || []).map((member: any) => ({
      id: member.id,
      user_id: member.user_id,
      role: member.role,
      profile: member.profiles,
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

  const inviteMember = async (email: string, role: "admin" | "editor" | "viewer") => {
    // In a real app, this would send an invitation email
    // For now, we'll just show a message
    console.log(`Invitation would be sent to ${email} with role ${role}`);
    return { success: true, message: `Invitation sent to ${email}` };
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
