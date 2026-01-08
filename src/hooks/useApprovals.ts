import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Approval {
  id: string;
  deployment_id: string;
  user_id: string;
  decision: "approved" | "rejected" | "pending";
  comment: string | null;
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const useApprovals = (deploymentId: string | null) => {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [userApproval, setUserApproval] = useState<Approval | null>(null);

  const fetchApprovals = async () => {
    if (!deploymentId) {
      setApprovals([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("approvals")
      .select(`
        id,
        deployment_id,
        user_id,
        decision,
        comment,
        created_at,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .eq("deployment_id", deploymentId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching approvals:", error);
      setLoading(false);
      return;
    }

    const formattedApprovals: Approval[] = (data || []).map((item: any) => ({
      id: item.id,
      deployment_id: item.deployment_id,
      user_id: item.user_id,
      decision: item.decision,
      comment: item.comment,
      created_at: item.created_at,
      profile: item.profiles,
    }));

    setApprovals(formattedApprovals);
    
    // Find current user's approval
    if (user) {
      const currentApproval = formattedApprovals.find(a => a.user_id === user.id);
      setUserApproval(currentApproval || null);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchApprovals();
  }, [deploymentId, user]);

  const submitApproval = async (decision: "approved" | "rejected", comment?: string) => {
    if (!deploymentId || !user) return false;

    // Check if user already has an approval
    if (userApproval) {
      const { error } = await supabase
        .from("approvals")
        .update({ decision, comment: comment || null })
        .eq("id", userApproval.id);

      if (error) {
        console.error("Error updating approval:", error);
        return false;
      }
    } else {
      const { error } = await supabase
        .from("approvals")
        .insert({
          deployment_id: deploymentId,
          user_id: user.id,
          decision,
          comment: comment || null,
        });

      if (error) {
        console.error("Error creating approval:", error);
        return false;
      }
    }

    await fetchApprovals();
    return true;
  };

  const approvalSummary = {
    approved: approvals.filter(a => a.decision === "approved").length,
    rejected: approvals.filter(a => a.decision === "rejected").length,
    pending: approvals.filter(a => a.decision === "pending").length,
    total: approvals.length,
  };

  return {
    approvals,
    loading,
    userApproval,
    submitApproval,
    approvalSummary,
    refetch: fetchApprovals,
  };
};
