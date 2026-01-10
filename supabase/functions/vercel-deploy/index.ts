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
    const { projectId: vercelProjectId, ref, teamId, projectId } = await req.json();
    
    // Validate authentication - projectId (Supabase project) is optional for backward compatibility
    // but if provided, verify user has editor+ access (deployments require write access)
    if (projectId) {
      await validateAuth(req, { projectId, requiredRole: 'editor' });
    } else {
      await validateAuth(req);
    }
    
    const vercelToken = Deno.env.get('VERCEL_TOKEN');
    
    if (!vercelToken) {
      throw new Error('VERCEL_TOKEN not configured');
    }

    console.log(`Triggering Vercel deployment for project ${vercelProjectId} with ref ${ref}`);

    // Build the URL with optional team ID
    let url = 'https://api.vercel.com/v13/deployments';
    if (teamId) {
      url += `?teamId=${teamId}`;
    }

    // First, get project info to determine deployment approach
    const projectResponse = await fetch(
      `https://api.vercel.com/v9/projects/${vercelProjectId}${teamId ? `?teamId=${teamId}` : ''}`,
      { headers: { 'Authorization': `Bearer ${vercelToken}` } }
    );
    
    const projectData = await projectResponse.json();
    console.log('Project data:', JSON.stringify(projectData, null, 2));
    
    // Build deployment body - omit target for preview deployments
    // deno-lint-ignore no-explicit-any
    const deploymentBody: any = {
      name: vercelProjectId,
      project: vercelProjectId
    };
    
    // Only add gitSource if we have the required repoId
    if (projectData.link?.repoId) {
      deploymentBody.gitSource = {
        type: 'github',
        ref: ref || 'main',
        repoId: projectData.link.repoId
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(deploymentBody)
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

  } catch (error: unknown) {
    console.error('Vercel deploy error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Access denied') || message.includes('Authorization') ? 401 : 500;
    return new Response(
      JSON.stringify({ error: message, success: false }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
