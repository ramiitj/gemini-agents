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
    const { owner, repo, head, base = 'main', title, body = '', projectId } = await req.json();
    
    // Validate authentication - projectId is optional for backward compatibility
    // but if provided, verify user has editor+ access
    if (projectId) {
      await validateAuth(req, { projectId, requiredRole: 'editor' });
    } else {
      await validateAuth(req);
    }
    
    const githubToken = Deno.env.get('GITHUB_PAT');
    
    if (!githubToken) {
      throw new Error('GITHUB_PAT not configured');
    }

    console.log(`Creating PR from ${head} to ${base} in ${owner}/${repo}`);

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'AI-Agent',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          body,
          head,
          base
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`GitHub API error: ${error.message || JSON.stringify(error)}`);
    }

    const data = await response.json();

    console.log(`Created PR #${data.number}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        prNumber: data.number,
        prUrl: data.html_url,
        prState: data.state,
        title: data.title,
        head: data.head.ref,
        base: data.base.ref
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('GitHub create PR error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Access denied') || message.includes('Authorization') ? 401 : 500;
    return new Response(
      JSON.stringify({ error: message, success: false }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
