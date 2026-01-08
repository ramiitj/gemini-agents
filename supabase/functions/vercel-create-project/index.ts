import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, githubRepo, framework = 'vite' } = await req.json();
    
    console.log('Creating Vercel project:', { name, githubRepo, framework });
    
    const vercelToken = Deno.env.get('VERCEL_TOKEN');
    if (!vercelToken) {
      throw new Error('VERCEL_TOKEN not configured');
    }
    
    // Parse GitHub URL to get owner/repo format
    const match = githubRepo.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
    if (!match) {
      throw new Error('Invalid GitHub repository URL format');
    }
    const repo = `${match[1]}/${match[2].replace('.git', '')}`;
    
    // Create slug-friendly project name
    const projectName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    
    console.log('Creating Vercel project with repo:', repo, 'name:', projectName);
    
    // Create Vercel project linked to GitHub repo
    const response = await fetch('https://api.vercel.com/v9/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: projectName,
        framework,
        gitRepository: {
          type: 'github',
          repo
        }
      })
    });
    
    const data = await response.json();
    
    console.log('Vercel API response:', JSON.stringify(data));
    
    if (data.error) {
      throw new Error(data.error.message || JSON.stringify(data.error));
    }
    
    // Trigger initial deployment
    let deploymentData = null;
    try {
      const deployResponse = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: projectName,
          project: data.id,
          gitSource: { 
            type: 'github', 
            ref: 'main',
            repo
          }
        })
      });
      deploymentData = await deployResponse.json();
      console.log('Initial deployment triggered:', JSON.stringify(deploymentData));
    } catch (e) {
      console.log('Initial deployment trigger failed (non-critical):', e);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        projectId: data.id,
        name: data.name,
        accountId: data.accountId,
        framework: data.framework,
        deployment: deploymentData ? {
          id: deploymentData.id,
          url: deploymentData.url
        } : null
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: unknown) {
    console.error('Error creating Vercel project:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
