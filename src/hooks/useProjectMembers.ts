import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ProjectMember {
  id: string;
  user_id: string;
  role: string;
  branch_name: string | null;
  created_at: string | null;
  profile: {
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
}

export const useProjectMembers = (projectId: string | undefined) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = async () => {
    if (!projectId || !user) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Fetch project_members first
    const { data: projectMembers, error: membersError } = await supabase
      .from("project_members")
      .select("id, user_id, role, branch_name, created_at")
      .eq("project_id", projectId);

    if (membersError) {
      console.error("Error fetching project members:", membersError);
      setLoading(false);
      return;
    }

    if (!projectMembers || projectMembers.length === 0) {
      setMembers([]);
      setLoading(false);
      return;
    }

    // Fetch profiles separately
    const userIds = projectMembers.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url, username")
      .in("id", userIds);

    // Combine the data
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    const formattedMembers: ProjectMember[] = projectMembers.map((member) => ({
      id: member.id,
      user_id: member.user_id,
      role: member.role,
      branch_name: member.branch_name,
      created_at: member.created_at,
      profile: profileMap.get(member.user_id) || null,
    }));

    setMembers(formattedMembers);
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, [projectId, user]);

  const removeMember = async (memberId: string) => {
    const { error } = await supabase
      .from("project_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      console.error("Error removing project member:", error);
      return false;
    }

    await fetchMembers();
    return true;
  };

  return {
    members,
    loading,
    removeMember,
    refetch: fetchMembers,
  };
};
