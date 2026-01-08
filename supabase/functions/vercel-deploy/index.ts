import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, ref, teamId } = await req.json();
    const vercelToken = Deno.env.get('VERCEL_TOKEN');
    
    if (!vercelToken) {
      throw new Error('VERCEL_TOKEN not configured');
    }

    console.log(`Triggering Vercel deployment for project ${projectId} with ref ${ref}`);

    // Build the URL with optional team ID
    let url = 'https://api.vercel.com/v13/deployments';
    if (teamId) {
      url += `?teamId=${teamId}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: projectId,
        project: projectId,
        target: 'preview',
        gitSource: {
          type: 'github',
          ref: ref
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Vercel API error: ${error.error?.message || JSON.stringify(error)}`);
    }

    const data = await response.json();

    console.log(`Deployment created: ${data.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        deploymentId: data.id,
        url: data.url,
        inspectorUrl: data.inspectorUrl,
        status: data.status || 'INITIALIZING',
        createdAt: data.createdAt
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Vercel deploy error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
