import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TeamAttachment } from '@/components/team/TeamFileUpload';

export interface TeamComment {
  id: string;
  change_request_id: string | null;
  project_id: string | null;
  parent_id: string | null;
  user_id: string;
  content: string;
  quoted_text: string | null;
  file_path: string | null;
  line_number: number | null;
  attachments: TeamAttachment[];
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  replies?: TeamComment[];
}

interface UseTeamCommentsOptions {
  changeRequestId?: string;
  projectId?: string;
}

interface UseTeamCommentsReturn {
  comments: TeamComment[];
  loading: boolean;
  addComment: (
    content: string,
    options?: {
      quotedText?: string;
      filePath?: string;
      lineNumber?: number;
      parentId?: string;
      attachments?: TeamAttachment[];
    }
  ) => Promise<void>;
  deleteComment: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useTeamComments(options: UseTeamCommentsOptions | string | undefined): UseTeamCommentsReturn {
  const [comments, setComments] = useState<TeamComment[]>([]);
  const [loading, setLoading] = useState(true);

  // Handle both old signature (changeRequestId string) and new options object
  const opts: UseTeamCommentsOptions = typeof options === 'string' 
    ? { changeRequestId: options }
    : options || {};

  const { changeRequestId, projectId } = opts;

  const fetchComments = async () => {
    if (!changeRequestId && !projectId) {
      setComments([]);
      setLoading(false);
      return;
    }

    let query = supabase.from('team_comments').select('*');
    
    if (changeRequestId) {
      query = query.eq('change_request_id', changeRequestId);
    } else if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data } = await query.order('created_at', { ascending: true });

    if (data) {
      // Fetch profiles separately
      const userIds = [...new Set(data.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);

      // Organize into threaded structure
      const commentMap = new Map<string, TeamComment>();
      const rootComments: TeamComment[] = [];

      data.forEach((comment: any) => {
        const profile = profileMap.get(comment.user_id) as { full_name: string | null; avatar_url: string | null } | undefined;
        commentMap.set(comment.id, { 
          ...comment, 
          attachments: comment.attachments || [],
          profile: profile || { full_name: null, avatar_url: null },
          replies: [] 
        });
      });

      commentMap.forEach((comment) => {
        if (comment.parent_id && commentMap.has(comment.parent_id)) {
          const parent = commentMap.get(comment.parent_id)!;
          parent.replies = parent.replies || [];
          parent.replies.push(comment);
        } else if (!comment.parent_id) {
          rootComments.push(comment);
        }
      });

      setComments(rootComments);
    }
    setLoading(false);
  };

  const addComment = useCallback(async (
    content: string,
    options?: {
      quotedText?: string;
      filePath?: string;
      lineNumber?: number;
      parentId?: string;
      attachments?: TeamAttachment[];
    }
  ) => {
    if (!changeRequestId && !projectId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const insertData: Record<string, any> = {
      user_id: user.id,
      content,
      quoted_text: options?.quotedText,
      file_path: options?.filePath,
      line_number: options?.lineNumber,
      parent_id: options?.parentId,
      attachments: options?.attachments || []
    };

    // Only add one scope
    if (changeRequestId) {
      insertData.change_request_id = changeRequestId;
    } else if (projectId) {
      insertData.project_id = projectId;
    }

    await supabase.from('team_comments').insert(insertData as any);
  }, [changeRequestId, projectId]);

  const deleteComment = useCallback(async (id: string) => {
    await supabase.from('team_comments').delete().eq('id', id);
  }, []);

  useEffect(() => {
    fetchComments();

    if (!changeRequestId && !projectId) return;

    const filterColumn = changeRequestId ? 'change_request_id' : 'project_id';
    const filterValue = changeRequestId || projectId;

    const channel = supabase
      .channel(`comments-${filterValue}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_comments',
          filter: `${filterColumn}=eq.${filterValue}`
        },
        () => fetchComments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [changeRequestId, projectId]);

  return { comments, loading, addComment, deleteComment, refetch: fetchComments };
}
