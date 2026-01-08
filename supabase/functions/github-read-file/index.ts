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
    const { owner, repo, path, branch = 'main' } = await req.json();
    const githubToken = Deno.env.get('GITHUB_PAT');
    
    if (!githubToken) {
      throw new Error('GITHUB_PAT not configured');
    }

    console.log(`Reading file ${path} from ${owner}/${repo} on branch ${branch}`);

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
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
    
    // Decode base64 content
    const content = data.content 
      ? new TextDecoder().decode(Uint8Array.from(atob(data.content.replace(/\n/g, '')), c => c.charCodeAt(0)))
      : '';

    return new Response(
      JSON.stringify({ 
        success: true,
        path: data.path,
        name: data.name,
        sha: data.sha,
        size: data.size,
        content,
        encoding: 'utf-8'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('GitHub read file error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
