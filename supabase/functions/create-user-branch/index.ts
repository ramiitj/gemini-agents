import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, userId } = await req.json();

    if (!projectId || !userId) {
      return new Response(
        JSON.stringify({ error: 'projectId and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const githubToken = Deno.env.get('GITHUB_TOKEN');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch project to get GitHub repo
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('github_repo, name')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Project fetch error:', projectError);
      return new Response(
        JSON.stringify({ error: 'Project not found', details: projectError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no GitHub repo configured, skip branch creation
    if (!project.github_repo) {
      console.log('No GitHub repo configured for project, skipping branch creation');
      return new Response(
        JSON.stringify({ success: true, branchName: null, message: 'No GitHub repo configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username, email, full_name')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
    }

    // Generate branch name
    const username = profile?.username || 
                     profile?.full_name?.toLowerCase().replace(/\s+/g, '-') || 
                     profile?.email?.split('@')[0] || 
                     'user';
    const shortId = userId.substring(0, 8);
    const branchName = `user/${username}-${shortId}`;

    // If no GitHub token, return the branch name without creating it
    if (!githubToken) {
      console.log('No GitHub token configured, returning branch name without creating');
      return new Response(
        JSON.stringify({ 
          success: true, 
          branchName, 
          message: 'Branch name generated but not created (no GitHub token)' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse owner and repo from github_repo
    // Format can be: "owner/repo" or "https://github.com/owner/repo"
    let owner: string, repo: string;
    const githubUrl = project.github_repo;
    
    if (githubUrl.includes('github.com')) {
      const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
      if (!match) {
        return new Response(
          JSON.stringify({ error: 'Invalid GitHub URL format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      owner = match[1];
      repo = match[2];
    } else {
      const parts = githubUrl.split('/');
      if (parts.length !== 2) {
        return new Response(
          JSON.stringify({ error: 'Invalid GitHub repo format, expected owner/repo' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      owner = parts[0];
      repo = parts[1];
    }

    console.log(`Creating branch ${branchName} for ${owner}/${repo}`);

    // Get the SHA of the main branch
    const refResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/main`,
      {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Holocron-App'
        }
      }
    );

    if (!refResponse.ok) {
      // Try 'master' branch if 'main' doesn't exist
      const masterResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/master`,
        {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Holocron-App'
          }
        }
      );
      
      if (!masterResponse.ok) {
        console.error('Failed to get main/master branch ref');
        return new Response(
          JSON.stringify({ 
            success: true, 
            branchName, 
            message: 'Branch name generated but base branch not found' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const masterData = await masterResponse.json();
      var baseSha = masterData.object.sha;
    } else {
      const refData = await refResponse.json();
      var baseSha = refData.object.sha;
    }

    // Create the new branch
    const createBranchResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Holocron-App'
        },
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: baseSha
        })
      }
    );

    if (!createBranchResponse.ok) {
      const errorData = await createBranchResponse.json();
      
      // Branch already exists is not an error
      if (errorData.message?.includes('Reference already exists')) {
        console.log('Branch already exists:', branchName);
        return new Response(
          JSON.stringify({ success: true, branchName, message: 'Branch already exists' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.error('Failed to create branch:', errorData);
      return new Response(
        JSON.stringify({ 
          success: true, 
          branchName, 
          message: 'Branch name generated but creation failed',
          error: errorData.message 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Branch created successfully:', branchName);

    return new Response(
      JSON.stringify({ success: true, branchName, message: 'Branch created successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-user-branch:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
