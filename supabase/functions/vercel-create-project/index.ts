import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth } from "../_shared/auth.ts";

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
    const { name, githubRepo, framework = 'vite', projectId } = await req.json();
    
    console.log('Creating Vercel project:', { name, githubRepo, framework, projectId });
    
    // Validate authentication - projectId is optional for backward compatibility
    // but if provided, verify user has editor+ access (creating Vercel projects requires write access)
    if (projectId) {
      await validateAuth(req, { projectId, requiredRole: 'editor' });
    } else {
      await validateAuth(req);
    }
    
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
    
    // Commit vercel.json to enable iframe embedding
    const githubToken = Deno.env.get('GITHUB_PAT');
    if (githubToken) {
      try {
        const [owner, repoName] = repo.split('/');
        // Note: X-Frame-Options doesn't support "ALLOWALL" - only DENY, SAMEORIGIN, or ALLOW-FROM
        // Use Content-Security-Policy frame-ancestors instead (the modern replacement)
        const vercelConfig = {
          headers: [
            {
              source: "/(.*)",
              headers: [
                { key: "Content-Security-Policy", value: "frame-ancestors *" },
                { key: "Access-Control-Allow-Origin", value: "*" }
              ]
            }
          ]
        };
        
        const ghHeaders = {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        };
        
        // Get the default branch's latest commit
        const refResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repoName}/git/ref/heads/main`,
          { headers: ghHeaders }
        );
        const refData = await refResponse.json();
        const baseSha = refData.object?.sha;
        
        if (baseSha) {
          // Get the tree from that commit
          const commitResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repoName}/git/commits/${baseSha}`,
            { headers: ghHeaders }
          );
          const commitData = await commitResponse.json();
          
          // Create a blob for vercel.json
          const blobResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repoName}/git/blobs`,
            {
              method: 'POST',
              headers: ghHeaders,
              body: JSON.stringify({
                content: JSON.stringify(vercelConfig, null, 2),
                encoding: 'utf-8'
              })
            }
          );
          const blobData = await blobResponse.json();
          
          // Create new tree with vercel.json
          const treeResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repoName}/git/trees`,
            {
              method: 'POST',
              headers: ghHeaders,
              body: JSON.stringify({
                base_tree: commitData.tree.sha,
                tree: [{
                  path: 'vercel.json',
                  mode: '100644',
                  type: 'blob',
                  sha: blobData.sha
                }]
              })
            }
          );
          const treeData = await treeResponse.json();
          
          // Create new commit
          const newCommitResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repoName}/git/commits`,
            {
              method: 'POST',
              headers: ghHeaders,
              body: JSON.stringify({
                message: 'Add vercel.json for iframe embedding support',
                tree: treeData.sha,
                parents: [baseSha]
              })
            }
          );
          const newCommitData = await newCommitResponse.json();
          
          // Update main branch reference
          await fetch(
            `https://api.github.com/repos/${owner}/${repoName}/git/refs/heads/main`,
            {
              method: 'PATCH',
              headers: ghHeaders,
              body: JSON.stringify({ sha: newCommitData.sha })
            }
          );
          
          console.log('Added vercel.json for iframe embedding');
        }
      } catch (e) {
        console.log('Could not add vercel.json (non-critical):', e);
      }
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
    const status = errorMessage.includes('Access denied') || errorMessage.includes('Authorization') ? 401 : 500;
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      { 
        status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
