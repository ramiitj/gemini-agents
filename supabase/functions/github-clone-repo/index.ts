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
    const { owner, repo, branch = 'main', projectId } = await req.json();
    
    // Validate authentication - projectId is optional for backward compatibility
    // but if provided, verify user has access
    if (projectId) {
      await validateAuth(req, { projectId, requiredRole: 'viewer' });
    } else {
      await validateAuth(req);
    }
    
    const githubToken = Deno.env.get('GITHUB_PAT');
    
    if (!githubToken) {
      throw new Error('GITHUB_PAT not configured');
    }

    console.log(`Listing files for ${owner}/${repo} on branch ${branch}`);

    // Get the repository tree
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'AI-Agent'
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`GitHub API error: ${error.message}`);
    }

    const data = await response.json();
    
    // Extract file paths and types
    // deno-lint-ignore no-explicit-any
    const files = data.tree?.map((item: any) => ({
      path: item.path,
      type: item.type, // 'blob' for files, 'tree' for directories
      size: item.size,
      sha: item.sha
    })) || [];

    console.log(`Found ${files.length} files in repository`);

    return new Response(
      JSON.stringify({ 
        success: true,
        owner,
        repo,
        branch,
        files,
        truncated: data.truncated || false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('GitHub clone repo error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Access denied') || message.includes('Authorization') ? 401 : 500;
    return new Response(
      JSON.stringify({ error: message, success: false }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
