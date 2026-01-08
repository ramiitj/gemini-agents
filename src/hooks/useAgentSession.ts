import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AgentSession {
  id: string;
  project_id: string;
  user_id: string;
  github_owner: string | null;
  github_repo: string | null;
  current_branch: string | null;
  staged_files: Record<string, { original: string; modified: string }>;
  vercel_project_id: string | null;
  agent_mode: "chat" | "execution";
  created_at: string;
  updated_at: string;
}

export function useAgentSession(projectId: string | undefined) {
  const [session, setSession] = useState<AgentSession | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('agent_sessions')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching agent session:', error);
        setLoading(false);
        return;
      }
      
      if (data) {
        setSession(data as AgentSession);
      } else {
        // No session exists - create one with execution mode as default
        const { data: newSession, error: createError } = await supabase
          .from('agent_sessions')
          .insert({
            project_id: projectId,
            user_id: user.id,
            agent_mode: 'execution', // Default to execution mode
            staged_files: {}
          })
          .select()
          .single();
        
        if (createError) {
          console.error('Error creating agent session:', createError);
        } else if (newSession) {
          setSession(newSession as AgentSession);
        }
      }
    } catch (e) {
      console.error('Error fetching session:', e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`agent-session-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_sessions',
          filter: `project_id=eq.${projectId}`
        },
        () => fetchSession()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, fetchSession]);

  const updateMode = useCallback(async (mode: "chat" | "execution") => {
    if (!projectId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('agent_sessions')
      .upsert({
        project_id: projectId,
        user_id: user.id,
        agent_mode: mode,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'project_id,user_id'
      });

    if (error) {
      console.error('Error updating agent mode:', error);
    } else {
      setSession(prev => prev ? { ...prev, agent_mode: mode } : null);
    }
  }, [projectId]);

  return { session, loading, updateMode, refetch: fetchSession };
}
