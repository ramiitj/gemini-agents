import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface TeamAction {
  id: string;
  project_id: string;
  comment_id: string | null;
  action_type: 'approval_request' | 'approved' | 'rejected' | 'merge_request' | 'merged';
  branch_name: string | null;
  preview_url: string | null;
  change_summary: string | null;
  files_changed: string[];
  initiated_by: string;
  acted_by: string | null;
  action_comment: string | null;
  created_at: string;
  resolved_at: string | null;
  pr_url: string | null;
  production_url: string | null;
  initiator_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  actor_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface ChangeShareData {
  previewUrl: string | null;
  branchName: string | null;
  files: string[];
  summary: string | null;
}

// Parse change share data from message content
export const parseChangeShare = (content: string): ChangeShareData | null => {
  // Look for: preview URL, branch name, file list
  const previewMatch = content.match(/https:\/\/[^\s]+\.vercel\.app[^\s]*/);
  const branchMatch = content.match(/branch:\s*([^\s\n]+)/i) || 
                      content.match(/(\w+\/[\w-]+)/); // user/branch format
  const filesMatch = content.match(/Files changed:\n([\s\S]+?)(?:\n\n|$)/);
  
  // Also detect the structured format from ChangeShareDialog
  const isStructuredShare = content.includes('•') && 
    (content.includes('Files changed:') || content.includes('need review'));
  
  if (previewMatch || isStructuredShare) {
    const files: string[] = [];
    if (filesMatch) {
      const fileLines = filesMatch[1].split('\n');
      fileLines.forEach(line => {
        const filePath = line.replace(/^[•\-\*]\s*/, '').trim();
        if (filePath) files.push(filePath);
      });
    }
    
    // Extract summary (first line usually)
    const summaryMatch = content.match(/^(.+?)(?:\n|$)/);
    
    return {
      previewUrl: previewMatch?.[0] || null,
      branchName: branchMatch?.[1] || null,
      files,
      summary: summaryMatch?.[1] || null
    };
  }
  
  return null;
};

export const useTeamActions = (projectId: string | null) => {
  const { user } = useAuth();
  const [actions, setActions] = useState<TeamAction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActions = useCallback(async () => {
    if (!projectId) {
      setActions([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("team_actions")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching team actions:", error);
      setLoading(false);
      return;
    }

    // Fetch profiles for initiators and actors
    const userIds = new Set<string>();
    data?.forEach(action => {
      if (action.initiated_by) userIds.add(action.initiated_by);
      if (action.acted_by) userIds.add(action.acted_by);
    });

    let profiles: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
    if (userIds.size > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", Array.from(userIds));
      
      profilesData?.forEach(p => {
        profiles[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
      });
    }

    const formattedActions: TeamAction[] = (data || []).map(action => ({
      ...action,
      action_type: action.action_type as TeamAction['action_type'],
      files_changed: (action.files_changed as string[]) || [],
      initiator_profile: profiles[action.initiated_by] || null,
      actor_profile: action.acted_by ? profiles[action.acted_by] || null : null,
    }));

    setActions(formattedActions);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  // Real-time subscription
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`team-actions-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_actions',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newAction = payload.new as TeamAction;
            if (newAction.action_type === 'approval_request') {
              toast.info('New changes shared for review');
            }
          } else if (payload.eventType === 'UPDATE') {
            const action = payload.new as TeamAction;
            if (action.action_type === 'approved') {
              toast.success('Changes approved! Ready to merge.');
            } else if (action.action_type === 'rejected') {
              toast.error(`Changes rejected: ${action.action_comment || 'No reason provided'}`);
            } else if (action.action_type === 'merged') {
              toast.success(`Merged & Deployed! ${action.production_url ? `Live at ${action.production_url}` : ''}`);
            }
          }
          // Refetch to get updated data with profiles
          fetchActions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, fetchActions]);

  const createApprovalRequest = useCallback(async (
    commentId: string,
    data: ChangeShareData
  ): Promise<TeamAction | null> => {
    if (!projectId || !user) return null;

    const { data: action, error } = await supabase
      .from("team_actions")
      .insert({
        project_id: projectId,
        comment_id: commentId,
        action_type: 'approval_request',
        branch_name: data.branchName,
        preview_url: data.previewUrl,
        change_summary: data.summary,
        files_changed: data.files,
        initiated_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating approval request:", error);
      return null;
    }

    return action as TeamAction;
  }, [projectId, user]);

  const approve = useCallback(async (
    actionId: string,
    comment?: string
  ): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from("team_actions")
      .update({
        action_type: 'approved',
        acted_by: user.id,
        action_comment: comment || null,
        resolved_at: new Date().toISOString()
      })
      .eq("id", actionId);

    if (error) {
      console.error("Error approving action:", error);
      toast.error("Failed to approve changes");
      return false;
    }

    return true;
  }, [user]);

  const reject = useCallback(async (
    actionId: string,
    comment: string
  ): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from("team_actions")
      .update({
        action_type: 'rejected',
        acted_by: user.id,
        action_comment: comment,
        resolved_at: new Date().toISOString()
      })
      .eq("id", actionId);

    if (error) {
      console.error("Error rejecting action:", error);
      toast.error("Failed to reject changes");
      return false;
    }

    return true;
  }, [user]);

  const merge = useCallback(async (actionId: string): Promise<boolean> => {
    if (!user || !projectId) return false;

    // Call the team-agent-action edge function
    try {
      const { data, error } = await supabase.functions.invoke('team-agent-action', {
        body: {
          action: 'merge',
          actionId,
          projectId
        }
      });

      if (error) {
        console.error("Error merging:", error);
        toast.error("Failed to merge changes");
        return false;
      }

      if (data?.success) {
        return true;
      } else {
        toast.error(data?.error || "Failed to merge changes");
        return false;
      }
    } catch (err) {
      console.error("Merge error:", err);
      toast.error("Failed to merge changes");
      return false;
    }
  }, [user, projectId]);

  // Get pending actions (approval requests)
  const pendingActions = actions.filter(a => a.action_type === 'approval_request');
  
  // Get approved actions waiting for the current user to merge
  const myPendingMerges = actions.filter(
    a => a.action_type === 'approved' && a.initiated_by === user?.id
  );

  // Get action for a specific comment
  const getActionForComment = useCallback((commentId: string): TeamAction | null => {
    return actions.find(a => a.comment_id === commentId) || null;
  }, [actions]);

  return {
    actions,
    pendingActions,
    myPendingMerges,
    loading,
    createApprovalRequest,
    approve,
    reject,
    merge,
    getActionForComment,
    refetch: fetchActions
  };
};
