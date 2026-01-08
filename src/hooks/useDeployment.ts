import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DeploymentStatus = "idle" | "building" | "deployed" | "failed";

interface Deployment {
  id: string;
  status: DeploymentStatus;
  url: string | null;
  error: string | null;
  createdAt: Date;
}

interface UseDeploymentReturn {
  deployment: Deployment | null;
  status: DeploymentStatus;
  triggerDeployment: (ref?: string) => Promise<void>;
  pollStatus: (deploymentId: string) => Promise<void>;
}

export const useDeployment = (vercelProjectId: string | null): UseDeploymentReturn => {
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [status, setStatus] = useState<DeploymentStatus>("idle");
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount - must be before useCallback hooks
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  const pollStatus = useCallback(async (deploymentId: string) => {
    if (!deploymentId) return;

    try {
      const { data, error } = await supabase.functions.invoke('vercel-status', {
        body: { deploymentId }
      });

      if (error) {
        console.error('Error polling deployment status:', error);
        return;
      }

      console.log('Deployment status:', data);

      if (data.readyState === 'ready' || data.status === 'READY') {
        setStatus("deployed");
        setDeployment(prev => prev ? {
          ...prev,
          status: "deployed",
          url: data.url
        } : null);
        
        // Stop polling
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      } else if (data.readyState === 'error' || data.status === 'ERROR' || data.status === 'CANCELED') {
        setStatus("failed");
        setDeployment(prev => prev ? {
          ...prev,
          status: "failed",
          error: data.errorMessage || data.error || 'Deployment failed'
        } : null);
        
        // Stop polling
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
      // If still building, continue polling
    } catch (e) {
      console.error('Error in pollStatus:', e);
    }
  }, []);

  const triggerDeployment = useCallback(async (ref: string = 'main') => {
    if (!vercelProjectId) {
      console.error('No Vercel project ID configured');
      return;
    }

    setStatus("building");
    setDeployment({
      id: '',
      status: "building",
      url: null,
      error: null,
      createdAt: new Date(),
    });

    try {
      const { data, error } = await supabase.functions.invoke('vercel-deploy', {
        body: { projectId: vercelProjectId, ref }
      });

      if (error) {
        console.error('Error triggering deployment:', error);
        setStatus("failed");
        setDeployment(prev => prev ? {
          ...prev,
          status: "failed",
          error: error.message || 'Failed to trigger deployment'
        } : null);
        return;
      }

      console.log('Deployment triggered:', data);

      if (!data.success) {
        setStatus("failed");
        setDeployment(prev => prev ? {
          ...prev,
          status: "failed",
          error: data.error || 'Deployment failed to start'
        } : null);
        return;
      }

      setDeployment(prev => prev ? {
        ...prev,
        id: data.deploymentId,
        url: data.url
      } : null);

      // Start polling for status
      pollingRef.current = setInterval(() => {
        pollStatus(data.deploymentId);
      }, 5000);

      // Initial poll
      setTimeout(() => pollStatus(data.deploymentId), 2000);

    } catch (e: any) {
      console.error('Error in triggerDeployment:', e);
      setStatus("failed");
      setDeployment(prev => prev ? {
        ...prev,
        status: "failed",
        error: e.message || 'Unknown error'
      } : null);
    }
  }, [vercelProjectId, pollStatus]);

  return {
    deployment,
    status,
    triggerDeployment,
    pollStatus,
  };
};
