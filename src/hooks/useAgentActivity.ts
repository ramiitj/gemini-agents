import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AgentActivity {
  id: string;
  project_id: string;
  conversation_id: string | null;
  activity_type: 
    | 'analyzing' 
    | 'writing' 
    | 'pushing' 
    | 'deploying' 
    | 'checking_logs' 
    | 'fixing' 
    | 'screenshot' 
    | 'complete'
    | 'web_search'
    | 'image_search';
  status: 'in_progress' | 'complete' | 'error';
  details?: {
    file?: string;
    attempt?: number;
    maxAttempts?: number;
    error?: string;
    url?: string;
    message?: string;
  };
  created_at: string;
}

export const useAgentActivity = (projectId: string | undefined, conversationId: string | undefined) => {
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [isActive, setIsActive] = useState(false);

  const clearActivities = useCallback(() => {
    setActivities([]);
    setIsActive(false);
  }, []);

  useEffect(() => {
    if (!projectId) return;

    // Fetch recent activities for this project
    const fetchActivities = async () => {
      const { data, error } = await supabase
        .from('agent_activity')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
        .limit(20);

      if (!error && data) {
        setActivities(data as AgentActivity[]);
        // Check if any activity is still in progress
        const hasInProgress = data.some(a => a.status === 'in_progress');
        setIsActive(hasInProgress);
      }
    };

    fetchActivities();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`agent-activity-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_activity',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          const newActivity = payload.new as AgentActivity;
          setActivities(prev => [...prev, newActivity]);
          if (newActivity.status === 'in_progress') {
            setIsActive(true);
          }
          if (newActivity.activity_type === 'complete') {
            setIsActive(false);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_activity',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          const updated = payload.new as AgentActivity;
          setActivities(prev => 
            prev.map(a => a.id === updated.id ? updated : a)
          );
          // Check if all are complete
          setActivities(prev => {
            const hasInProgress = prev.some(a => a.status === 'in_progress');
            setIsActive(hasInProgress);
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  // Clear old activities when conversation changes
  useEffect(() => {
    if (conversationId) {
      setActivities([]);
    }
  }, [conversationId]);

  return { activities, isActive, clearActivities };
};
