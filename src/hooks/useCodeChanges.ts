import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CodeChange {
  id: string;
  project_id: string;
  conversation_id: string | null;
  message_id: string | null;
  agent_run_id: string | null;
  file_path: string;
  status: 'added' | 'modified' | 'deleted';
  original_content: string | null;
  modified_content: string | null;
  diff_content: string | null;
  additions: number;
  deletions: number;
  commit_sha: string | null;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

interface UseCodeChangesReturn {
  changes: CodeChange[];
  loading: boolean;
  error: string | null;
  approveChanges: (changeIds: string[]) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useCodeChanges(
  projectId: string | undefined,
  conversationId?: string
): UseCodeChangesReturn {
  const [changes, setChanges] = useState<CodeChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChanges = async () => {
    if (!projectId) {
      setChanges([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('code_changes')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setChanges((data as CodeChange[]) || []);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch changes');
    } finally {
      setLoading(false);
    }
  };

  const approveChanges = async (changeIds: string[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: updateError } = await supabase
      .from('code_changes')
      .update({
        approved_at: new Date().toISOString(),
        approved_by: user.id
      })
      .in('id', changeIds);

    if (!updateError) {
      await fetchChanges();
    }
  };

  useEffect(() => {
    fetchChanges();

    if (!projectId) return;

    // Real-time subscription for new changes
    const channel = supabase
      .channel(`code-changes-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'code_changes',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setChanges(prev => [payload.new as CodeChange, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setChanges(prev =>
              prev.map(c => c.id === payload.new.id ? payload.new as CodeChange : c)
            );
          } else if (payload.eventType === 'DELETE') {
            setChanges(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, conversationId]);

  return { changes, loading, error, approveChanges, refetch: fetchChanges };
}
