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
    const { owner, repo, branch, message, files, baseBranch = 'main' } = await req.json();
    const githubToken = Deno.env.get('GITHUB_PAT');
    
    if (!githubToken) {
      throw new Error('GITHUB_PAT not configured');
    }

    if (!files || files.length === 0) {
      throw new Error('No files provided to commit');
    }

    console.log(`Committing ${files.length} files to ${owner}/${repo} on branch ${branch}`);

    const headers = {
      'Authorization': `Bearer ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'AI-Agent',
      'Content-Type': 'application/json'
    };

    // 1. Get the base branch reference
    const refResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`,
      { headers }
    );
    
    if (!refResponse.ok) {
      throw new Error(`Could not get reference for ${baseBranch}`);
    }
    
    const refData = await refResponse.json();
    const baseSha = refData.object.sha;

    // 2. Get the base commit to get its tree
    const commitResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits/${baseSha}`,
      { headers }
    );
    const commitData = await commitResponse.json();
    const baseTreeSha = commitData.tree.sha;

    // 3. Create blobs for each file
    const treeItems = [];
    for (const file of files) {
      const blobResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content: file.content,
            encoding: 'utf-8'
          })
        }
      );
      
      if (!blobResponse.ok) {
        throw new Error(`Failed to create blob for ${file.path}`);
      }
      
      const blobData = await blobResponse.json();
      treeItems.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha
      });
    }

    // 4. Create a new tree
    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeItems
        })
      }
    );
    
    if (!treeResponse.ok) {
      throw new Error('Failed to create tree');
    }
    
    const treeData = await treeResponse.json();

    // 5. Create a new commit
    const newCommitResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message,
          tree: treeData.sha,
          parents: [baseSha]
        })
      }
    );
    
    if (!newCommitResponse.ok) {
      throw new Error('Failed to create commit');
    }
    
    const newCommitData = await newCommitResponse.json();

    // 6. Create or update the branch reference
    const createRefResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ref: `refs/heads/${branch}`,
          sha: newCommitData.sha
        })
      }
    );

    let branchCreated = createRefResponse.ok;
    
    // If branch already exists, update it
    if (!branchCreated && createRefResponse.status === 422) {
      const updateRefResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            sha: newCommitData.sha,
            force: true
          })
        }
      );
      branchCreated = updateRefResponse.ok;
    }

    console.log(`Successfully committed to branch ${branch}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        branch,
        commitSha: newCommitData.sha,
        commitUrl: `https://github.com/${owner}/${repo}/commit/${newCommitData.sha}`,
        filesCommitted: files.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('GitHub commit push error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
