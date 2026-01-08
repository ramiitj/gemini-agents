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
    const { projectId, branch } = await req.json();

    if (!projectId || !branch) {
      return new Response(
        JSON.stringify({ error: 'Missing projectId or branch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const vercelToken = Deno.env.get('VERCEL_TOKEN');
    if (!vercelToken) {
      return new Response(
        JSON.stringify({ error: 'VERCEL_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch deployments for this project
    const response = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${projectId}&target=preview&limit=20`,
      {
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (data.error) {
      return new Response(
        JSON.stringify({ error: data.error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find latest deployment for this branch
    const branchDeployment = data.deployments?.find((d: any) =>
      d.meta?.githubCommitRef === branch ||
      d.meta?.branchAlias === branch ||
      d.gitSource?.ref === branch
    );

    if (!branchDeployment) {
      return new Response(
        JSON.stringify({
          branch,
          deployment: null,
          message: 'No deployment found for this branch'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        branch,
        deployment: {
          id: branchDeployment.uid,
          url: branchDeployment.url?.startsWith('http') 
            ? branchDeployment.url 
            : `https://${branchDeployment.url}`,
          state: branchDeployment.readyState,
          createdAt: branchDeployment.createdAt,
          meta: branchDeployment.meta
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error fetching branch status:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch branch status' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
