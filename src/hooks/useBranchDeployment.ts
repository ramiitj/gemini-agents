import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BranchDeployment {
  id: string;
  url: string;
  state: "BUILDING" | "READY" | "ERROR" | "QUEUED" | "CANCELED";
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

  const fetchDeployment = useCallback(async () => {
    if (!vercelProjectId || !branch) {
      setDeployment(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('vercel-branch-status', {
        body: { projectId: vercelProjectId, branch }
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.deployment) {
        setDeployment({
          id: data.deployment.id,
          url: data.deployment.url,
          state: data.deployment.state,
          createdAt: data.deployment.createdAt,
          branch: data.branch
        });
      } else {
        setDeployment(null);
      }
    } catch (e: any) {
      console.error('Error fetching branch deployment:', e);
      setError(e.message || 'Failed to fetch deployment');
    } finally {
      setLoading(false);
    }
  }, [vercelProjectId, branch]);

  useEffect(() => {
    fetchDeployment();

    // Poll every 10 seconds when we have a branch
    if (vercelProjectId && branch) {
      const interval = setInterval(fetchDeployment, 10000);
      return () => clearInterval(interval);
    }
  }, [fetchDeployment, vercelProjectId, branch]);

  return { deployment, loading, error, refetch: fetchDeployment };
}
