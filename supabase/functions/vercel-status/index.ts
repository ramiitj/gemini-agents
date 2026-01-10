import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { deploymentId, teamId, projectId } = await req.json();
    
    // Validate authentication - projectId is optional for backward compatibility
    // but if provided, verify user has access
    if (projectId) {
      await validateAuth(req, { projectId, requiredRole: 'viewer' });
    } else {
      await validateAuth(req);
    }
    
    const vercelToken = Deno.env.get('VERCEL_TOKEN');
    
    if (!vercelToken) {
      throw new Error('VERCEL_TOKEN not configured');
    }

    console.log(`Checking deployment status for ${deploymentId}`);

    // Build the URL with optional team ID
    let url = `https://api.vercel.com/v13/deployments/${deploymentId}`;
    if (teamId) {
      url += `?teamId=${teamId}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${vercelToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Vercel API error: ${error.error?.message || JSON.stringify(error)}`);
    }

    const data = await response.json();

    // Map Vercel status to simpler states
    const statusMap: Record<string, string> = {
      'INITIALIZING': 'building',
      'ANALYZING': 'building',
      'BUILDING': 'building',
      'DEPLOYING': 'building',
      'READY': 'ready',
      'ERROR': 'error',
      'CANCELED': 'error',
      'QUEUED': 'building'
    };

    return new Response(
      JSON.stringify({ 
        success: true,
        deploymentId: data.id,
        status: data.status,
        readyState: statusMap[data.status] || data.status.toLowerCase(),
        url: data.url ? `https://${data.url}` : null,
        inspectorUrl: data.inspectorUrl,
        createdAt: data.createdAt,
        buildingAt: data.buildingAt,
        ready: data.ready,
        errorMessage: data.errorMessage || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Vercel status error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Access denied') || message.includes('Authorization') ? 401 : 500;
    return new Response(
      JSON.stringify({ error: message, success: false }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
