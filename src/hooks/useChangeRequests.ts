import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChangeRequest {
  id: string;
  project_id: string;
  conversation_id: string | null;
  deployment_id: string | null;
  title: string;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'merged';
  commit_sha: string | null;
  github_pr_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface UseChangeRequestsReturn {
  requests: ChangeRequest[];
  loading: boolean;
  createChangeRequest: (params: {
    title: string;
    description?: string;
    conversationId?: string;
    deploymentId?: string;
  }) => Promise<ChangeRequest | null>;
  updateStatus: (id: string, status: ChangeRequest['status']) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useChangeRequests(projectId: string | undefined): UseChangeRequestsReturn {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    if (!projectId) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('change_requests')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (data) {
      setRequests(data as ChangeRequest[]);
    }
    setLoading(false);
  };

  const createChangeRequest = useCallback(async (params: {
    title: string;
    description?: string;
    conversationId?: string;
    deploymentId?: string;
  }) => {
    if (!projectId) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('change_requests')
      .insert({
        project_id: projectId,
        title: params.title,
        description: params.description,
        conversation_id: params.conversationId,
        deployment_id: params.deploymentId,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create change request:', error);
      return null;
    }

    return data as ChangeRequest;
  }, [projectId]);

  const updateStatus = useCallback(async (id: string, status: ChangeRequest['status']) => {
    await supabase
      .from('change_requests')
      .update({ status })
      .eq('id', id);
  }, []);

  useEffect(() => {
    fetchRequests();

    if (!projectId) return;

    const channel = supabase
      .channel(`change-requests-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'change_requests',
          filter: `project_id=eq.${projectId}`
        },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  return { requests, loading, createChangeRequest, updateStatus, refetch: fetchRequests };
}
