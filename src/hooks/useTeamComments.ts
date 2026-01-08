import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TeamComment {
  id: string;
  change_request_id: string;
  parent_id: string | null;
  user_id: string;
  content: string;
  quoted_text: string | null;
  file_path: string | null;
  line_number: number | null;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  replies?: TeamComment[];
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
    }
  ) => Promise<void>;
  deleteComment: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useTeamComments(changeRequestId: string | undefined): UseTeamCommentsReturn {
  const [comments, setComments] = useState<TeamComment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    if (!changeRequestId) {
      setComments([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('team_comments')
      .select('*')
      .eq('change_request_id', changeRequestId)
      .order('created_at', { ascending: true });

    if (data) {
      // Fetch profiles separately to avoid join issues
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
    }
  ) => {
    if (!changeRequestId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('team_comments').insert({
      change_request_id: changeRequestId,
      user_id: user.id,
      content,
      quoted_text: options?.quotedText,
      file_path: options?.filePath,
      line_number: options?.lineNumber,
      parent_id: options?.parentId
    });
  }, [changeRequestId]);

  const deleteComment = useCallback(async (id: string) => {
    await supabase.from('team_comments').delete().eq('id', id);
  }, []);

  useEffect(() => {
    fetchComments();

    if (!changeRequestId) return;

    const channel = supabase
      .channel(`comments-${changeRequestId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_comments',
          filter: `change_request_id=eq.${changeRequestId}`
        },
        () => fetchComments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [changeRequestId]);

  return { comments, loading, addComment, deleteComment, refetch: fetchComments };
}
