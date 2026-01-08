import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BranchDeployment {
  id: string;
  url: string;
  state: "BUILDING" | "READY" | "ERROR" | "QUEUED" | "CANCELED" | "WAITING";
  createdAt: string;
  branch: string;
}

export function useBranchDeployment(
  vercelProjectId: string | null | undefined,
  branch: string | null | undefined
) {
  const [deployment, setDeployment] = useState<BranchDeployment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollCount = useRef(0);
  const lastDeploymentId = useRef<string | null>(null);

  const fetchDeployment = useCallback(async () => {
    if (!vercelProjectId || !branch) {
      setDeployment(null);
      return;
    }

    // Only show loading on first fetch
    if (pollCount.current === 0) {
      setLoading(true);
    }
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('vercel-branch-status', {
        body: { projectId: vercelProjectId, branch }
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.deployment) {
        const newDeployment: BranchDeployment = {
          id: data.deployment.id,
          url: data.deployment.url,
          state: data.deployment.state,
          createdAt: data.deployment.createdAt,
          branch: data.branch
        };
        
        // Detect new deployment
        if (lastDeploymentId.current && lastDeploymentId.current !== newDeployment.id) {
          pollCount.current = 0; // Reset poll count for faster polling
        }
        lastDeploymentId.current = newDeployment.id;
        
        setDeployment(newDeployment);
      } else {
        // No deployment yet - show waiting state
        setDeployment({
          id: 'waiting',
          url: '',
          state: 'WAITING',
          createdAt: new Date().toISOString(),
          branch
        });
      }
    } catch (e: any) {
      console.error('Error fetching branch deployment:', e);
      setError(e.message || 'Failed to fetch deployment');
    } finally {
      setLoading(false);
      pollCount.current++;
    }
  }, [vercelProjectId, branch]);

  useEffect(() => {
    // Reset on branch/project change
    pollCount.current = 0;
    lastDeploymentId.current = null;
    
    fetchDeployment();

    // Dynamic polling: faster initially, slower after
    if (vercelProjectId && branch) {
      const getInterval = () => {
        // Fast polling (5s) for first minute, then slow (15s)
        return pollCount.current < 12 ? 5000 : 15000;
      };
      
      let intervalId: number;
      const schedulePoll = () => {
        intervalId = setTimeout(() => {
          fetchDeployment();
          schedulePoll();
        }, getInterval()) as unknown as number;
      };
      
      schedulePoll();
      return () => clearTimeout(intervalId);
    }
  }, [fetchDeployment, vercelProjectId, branch]);

  return { deployment, loading, error, refetch: fetchDeployment };
}
