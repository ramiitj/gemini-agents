import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tool definitions matching exact specification
const toolDefinitions = [
  {
    name: 'github_clone_repo',
    description: 'Clone a GitHub repository to a temporary workspace for editing',
    parameters: {
      type: 'OBJECT',
      properties: {
        repo_url: { type: 'STRING', description: 'Full GitHub repository URL (e.g., https://github.com/org/repo)' },
        branch: { type: 'STRING', description: 'Branch name to clone (default: main)' }
      },
      required: ['repo_url']
    }
  },
  {
    name: 'file_read',
    description: 'Read the contents of a file from the cloned repository',
    parameters: {
      type: 'OBJECT',
      properties: {
        file_path: { type: 'STRING', description: 'Relative path to the file from repo root' }
      },
      required: ['file_path']
    }
  },
  {
    name: 'file_write',
    description: 'Write or update a file in the cloned repository',
    parameters: {
      type: 'OBJECT',
      properties: {
        file_path: { type: 'STRING', description: 'Relative path to the file from repo root' },
        content: { type: 'STRING', description: 'Complete new content for the file' }
      },
      required: ['file_path', 'content']
    }
  },
  {
    name: 'file_delete',
    description: 'Delete a file from the repository. Requires explicit confirmation.',
    parameters: {
      type: 'OBJECT',
      properties: {
        file_path: { type: 'STRING', description: 'Path to file to delete' },
        confirm: { type: 'BOOLEAN', description: 'Must be true to confirm deletion' }
      },
      required: ['file_path', 'confirm']
    }
  },
  {
    name: 'list_directory',
    description: 'List all files and folders in a directory of the cloned repository. Use to explore project structure.',
    parameters: {
      type: 'OBJECT',
      properties: {
        path: { type: 'STRING', description: 'Directory path relative to repo root (use "." for root)' },
        recursive: { type: 'BOOLEAN', description: 'List all files recursively (default: false)' }
      },
      required: ['path']
    }
  },
  {
    name: 'search_code',
    description: 'Search for text patterns or code snippets across the repository. Use to find where specific functionality is implemented.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Search query (supports GitHub code search syntax)' },
        file_extension: { type: 'STRING', description: 'Filter by file extension (e.g., "tsx", "ts")' }
      },
      required: ['query']
    }
  },
  {
    name: 'generate_diff',
    description: 'Generate a human-readable diff of changes made to files',
    parameters: {
      type: 'OBJECT',
      properties: {
        file_paths: { 
          type: 'ARRAY', 
          items: { type: 'STRING' }, 
          description: 'List of file paths to include in diff' 
        }
      },
      required: ['file_paths']
    }
  },
  {
    name: 'git_add_commit_push',
    description: 'Stage all changes, commit with a message, and push to the remote branch',
    parameters: {
      type: 'OBJECT',
      properties: {
        commit_message: { type: 'STRING', description: 'Descriptive commit message' },
        branch: { type: 'STRING', description: 'Branch to push to (optional - uses current branch if not specified)' }
      },
      required: ['commit_message']
    }
  },
  {
    name: 'vercel_create_project',
    description: 'Create a new Vercel project linked to a GitHub repository. Use this after cloning a repo to set up automatic deployments.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Project name (will be slugified)' },
        repo: { type: 'STRING', description: 'GitHub repository in owner/repo format or full URL' },
        framework: { type: 'STRING', description: 'Framework (vite, nextjs, react). Default: vite' }
      },
      required: ['name', 'repo']
    }
  },
  {
    name: 'vercel_trigger_deployment',
    description: 'Deploy existing code to Vercel. Uses context automatically - NO arguments needed. Just call with empty args.',
    parameters: {
      type: 'OBJECT',
      properties: {
        project_id: { type: 'STRING', description: 'Optional - uses context if not provided' },
        branch: { type: 'STRING', description: 'Optional - uses current branch if not provided' }
      },
      required: []
    }
  },
  {
    name: 'vercel_get_deployment_status',
    description: 'Check the status of a Vercel deployment',
    parameters: {
      type: 'OBJECT',
      properties: {
        deployment_id: { type: 'STRING', description: 'Vercel deployment ID' }
      },
      required: ['deployment_id']
    }
  },
  {
    name: 'get_build_logs',
    description: 'Retrieve detailed build logs from a Vercel deployment. Use to diagnose build failures.',
    parameters: {
      type: 'OBJECT',
      properties: {
        deployment_id: { type: 'STRING', description: 'Vercel deployment ID' },
        log_type: { type: 'STRING', description: 'Type of logs: "build" or "runtime" (default: build)' }
      },
      required: ['deployment_id']
    }
  },
  {
    name: 'capture_screenshot',
    description: 'Capture a screenshot of a deployed website for visual inspection. Use to verify UI changes or analyze design issues.',
    parameters: {
      type: 'OBJECT',
      properties: {
        url: { type: 'STRING', description: 'Full URL of the page to screenshot' },
        viewport_width: { type: 'NUMBER', description: 'Viewport width in pixels (default: 1280)' },
        viewport_height: { type: 'NUMBER', description: 'Viewport height in pixels (default: 720)' },
        full_page: { type: 'BOOLEAN', description: 'Capture full scrollable page (default: false)' },
        selector: { type: 'STRING', description: 'CSS selector to screenshot specific element' }
      },
      required: ['url']
    }
  },
  {
    name: 'analyze_visual_element',
    description: 'Analyze a visually selected element from the preview. Use to understand element context and suggest targeted code changes based on user selection.',
    parameters: {
      type: 'OBJECT',
      properties: {
        selector: { type: 'STRING', description: 'CSS selector of the element' },
        element_html: { type: 'STRING', description: 'Outer HTML of the element' },
        computed_styles: { type: 'STRING', description: 'JSON of computed styles (color, font, spacing, etc.)' },
        bounding_box: { type: 'STRING', description: 'JSON with x, y, width, height of element' },
        user_request: { type: 'STRING', description: 'What the user wants to change about this element' },
        text_content: { type: 'STRING', description: 'Text content of the element' }
      },
      required: ['selector', 'user_request']
    }
  },
  {
    name: 'github_create_pull_request',
    description: 'Create a GitHub Pull Request for the changes',
    parameters: {
      type: 'OBJECT',
      properties: {
        repo_url: { type: 'STRING', description: 'GitHub repository URL' },
        head_branch: { type: 'STRING', description: 'Branch with changes' },
        base_branch: { type: 'STRING', description: 'Branch to merge into (usually main)' },
        title: { type: 'STRING', description: 'PR title' },
        body: { type: 'STRING', description: 'PR description with summary of changes' }
      },
      required: ['repo_url', 'head_branch', 'base_branch', 'title']
    }
  }
];

// Read-only tools for chat mode (including clone to establish context)
const chatModeTools = [
  'github_clone_repo', // Allowed in chat mode to establish repo context
  'file_read',
  'list_directory', 
  'search_code',
  'generate_diff',
  'capture_screenshot',
  'analyze_visual_element',
  'vercel_get_deployment_status',
  'get_build_logs'
];

// Generate unified diff for file changes
function generateUnifiedDiff(path: string, original: string, modified: string): string {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  
  let diff = `--- a/${path}\n+++ b/${path}\n`;
  
  // Find changed sections
  let i = 0;
  while (i < Math.max(originalLines.length, modifiedLines.length)) {
    const origLine = originalLines[i] ?? null;
    const modLine = modifiedLines[i] ?? null;
    
    if (origLine !== modLine) {
      // Start of a change hunk
      const hunkStart = Math.max(0, i - 2);
      let hunkEnd = i;
      
      // Find end of changes
      while (hunkEnd < Math.max(originalLines.length, modifiedLines.length)) {
        const o = originalLines[hunkEnd] ?? null;
        const m = modifiedLines[hunkEnd] ?? null;
        if (o === m) {
          // Check if we have 3 consecutive matching lines
          let matches = 0;
          for (let j = 0; j < 3 && hunkEnd + j < Math.max(originalLines.length, modifiedLines.length); j++) {
            if (originalLines[hunkEnd + j] === modifiedLines[hunkEnd + j]) matches++;
          }
          if (matches >= 3) break;
        }
        hunkEnd++;
      }
      hunkEnd = Math.min(hunkEnd + 2, Math.max(originalLines.length, modifiedLines.length));
      
      // Output hunk header
      diff += `@@ -${hunkStart + 1},${Math.min(hunkEnd - hunkStart, originalLines.length - hunkStart)} +${hunkStart + 1},${Math.min(hunkEnd - hunkStart, modifiedLines.length - hunkStart)} @@\n`;
      
      // Output lines
      for (let j = hunkStart; j < hunkEnd; j++) {
        const o = originalLines[j];
        const m = modifiedLines[j];
        
        if (o === m && o !== undefined) {
          diff += ` ${o}\n`;
        } else {
          if (o !== undefined && o !== m) diff += `-${o}\n`;
          if (m !== undefined && m !== o) diff += `+${m}\n`;
        }
      }
      
      i = hunkEnd;
    } else {
      i++;
    }
  }
  
  return diff || `--- a/${path}\n+++ b/${path}\n(no changes)`;
}

// Get Google OAuth access token from service account
async function getGoogleAccessToken(serviceAccount: any): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = serviceAccount.private_key
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const claimB64 = btoa(JSON.stringify(claim)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signatureInput = `${headerB64}.${claimB64}`;
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signatureInput)
  );
  
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  const jwt = `${signatureInput}.${signatureB64}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }
  
  return tokenData.access_token;
}

// Tool execution context interface
interface ToolContext {
  stagedFiles: Record<string, { original: string; modified: string }>;
  currentRepo?: { owner: string; repo: string; branch: string };
  lastDeploymentId?: string;
  lastVercelProjectId?: string;
  projectId?: string;
  conversationId?: string;
  userId?: string;
}

// Load agent session from database
async function loadAgentSession(
  supabaseUrl: string,
  supabaseKey: string,
  projectId: string,
  userId: string
): Promise<any | null> {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/agent_sessions?project_id=eq.${projectId}&user_id=eq.${userId}&select=*`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        }
      }
    );
    const sessions = await response.json();
    return sessions?.[0] || null;
  } catch (e) {
    console.error('Failed to load agent session:', e);
    return null;
  }
}

// Save agent session to database
async function saveAgentSession(
  supabaseUrl: string,
  supabaseKey: string,
  projectId: string,
  userId: string,
  context: ToolContext,
  mode: string
): Promise<void> {
  try {
    // Check if session exists first
    const checkResponse = await fetch(
      `${supabaseUrl}/rest/v1/agent_sessions?project_id=eq.${projectId}&user_id=eq.${userId}&select=id`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        }
      }
    );
    const existing = await checkResponse.json();
    
    const sessionData = {
      github_owner: context.currentRepo?.owner || null,
      github_repo: context.currentRepo?.repo || null,
      current_branch: context.currentRepo?.branch || null,
      staged_files: context.stagedFiles || {},
      vercel_project_id: context.lastVercelProjectId || null,
      agent_mode: mode,
      updated_at: new Date().toISOString()
    };
    
    console.log('Saving session data:', { 
      github_owner: sessionData.github_owner, 
      github_repo: sessionData.github_repo,
      current_branch: sessionData.current_branch 
    });

    if (existing && existing.length > 0) {
      // UPDATE existing session
      const updateRes = await fetch(
        `${supabaseUrl}/rest/v1/agent_sessions?project_id=eq.${projectId}&user_id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(sessionData)
        }
      );
      if (!updateRes.ok) {
        console.error('Failed to update session:', await updateRes.text());
      }
    } else {
      // INSERT new session
      const insertRes = await fetch(`${supabaseUrl}/rest/v1/agent_sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          project_id: projectId,
          user_id: userId,
          ...sessionData
        })
      });
      if (!insertRes.ok) {
        console.error('Failed to insert session:', await insertRes.text());
      }
    }
  } catch (e) {
    console.error('Failed to save agent session:', e);
  }
}

// Execute a tool call
async function executeTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolContext
): Promise<{ result: any; context: ToolContext }> {
  console.log(`Executing tool: ${toolName}`, args);
  
  const githubToken = Deno.env.get('GITHUB_PAT');
  const vercelToken = Deno.env.get('VERCEL_TOKEN');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  const githubHeaders = {
    'Authorization': `Bearer ${githubToken}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'ProductCompass-AI-Agent'
  };

  switch (toolName) {
    case 'github_clone_repo': {
      const { repo_url, branch = 'main' } = args;
      
      // Parse repo_url to extract owner/repo
      const match = repo_url.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
      if (!match) {
        return { result: { error: 'Invalid GitHub URL format' }, context };
      }
      
      const [, owner, repo] = match;
      
      // If we have a userId, create/use a user-specific branch
      let targetBranch = branch;
      if (context.userId && branch === 'main') {
        // Create a user-specific branch name
        const userPrefix = context.userId.substring(0, 8);
        targetBranch = `user/${userPrefix}`;
        
        // Check if branch exists, if not create it from main
        const branchCheckRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${targetBranch}`,
          { headers: githubHeaders }
        );
        
        if (branchCheckRes.status === 404) {
          // Get main branch SHA
          const mainRef = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/main`,
            { headers: githubHeaders }
          );
          const mainData = await mainRef.json();
          
          if (mainData.object?.sha) {
            // Create branch from main
            await fetch(
              `https://api.github.com/repos/${owner}/${repo}/git/refs`,
              {
                method: 'POST',
                headers: { ...githubHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ref: `refs/heads/${targetBranch}`,
                  sha: mainData.object.sha
                })
              }
            );
            console.log(`Created user branch: ${targetBranch}`);
          }
        }
      }
      
      context.currentRepo = { owner, repo: repo.replace('.git', ''), branch: targetBranch };
      
      // IMMEDIATELY save session with branch info so it persists
      const supabaseUrlEnv = Deno.env.get('SUPABASE_URL');
      const supabaseKeyEnv = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (supabaseUrlEnv && supabaseKeyEnv && context.projectId && context.userId) {
        await saveAgentSession(supabaseUrlEnv, supabaseKeyEnv, context.projectId, context.userId, context, 'execution');
        console.log(`Immediately saved session with branch: ${targetBranch}`);
      }
      
      // Get file tree
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`,
        { headers: githubHeaders }
      );
      const data = await response.json();
      
      if (data.message) {
        return { result: { error: data.message }, context };
      }
      
      const files = data.tree?.filter((f: any) => f.type === 'blob').map((f: any) => f.path) || [];
      
      return {
        result: { 
          cloned: true, 
          owner, 
          repo, 
          branch: targetBranch,
          fileCount: files.length,
          files: files.slice(0, 50), // Return first 50 files for context
          message: `Repository cloned. Working on your personal branch: ${targetBranch}. This branch is auto-managed - never ask the user about branches.`
        },
        context
      };
    }

    case 'file_read': {
      const { file_path } = args;
      
      if (!context.currentRepo) {
        return { result: { error: 'No repository cloned. Use github_clone_repo first.' }, context };
      }
      
      const { owner, repo, branch } = context.currentRepo;
      
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${file_path}?ref=${branch}`,
        { headers: githubHeaders }
      );
      const data = await response.json();
      
      if (data.message) {
        return { result: { error: data.message, path: file_path }, context };
      }
      
      const content = data.content ? atob(data.content.replace(/\n/g, '')) : '';
      
      // Store original content for diff generation
      context.stagedFiles[file_path] = { original: content, modified: content };
      
      return { result: { path: file_path, content, size: data.size }, context };
    }

    case 'file_write': {
      const { file_path, content } = args;
      
      // Initialize if needed (new file case)
      const original = context.stagedFiles[file_path]?.original || '';
      if (!context.stagedFiles[file_path]) {
        context.stagedFiles[file_path] = { original: '', modified: content };
      } else {
        context.stagedFiles[file_path].modified = content;
      }
      
      // Store change in database for UI display
      if (supabaseUrl && supabaseKey && context.projectId) {
        try {
          const diff = generateUnifiedDiff(file_path, original, content);
          const additions = diff.split('\n').filter((l: string) => l.startsWith('+') && !l.startsWith('+++')).length;
          const deletions = diff.split('\n').filter((l: string) => l.startsWith('-') && !l.startsWith('---')).length;
          
          await fetch(`${supabaseUrl}/rest/v1/code_changes`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              project_id: context.projectId,
              conversation_id: context.conversationId || null,
              file_path,
              status: original ? 'modified' : 'added',
              original_content: original,
              modified_content: content,
              diff_content: diff,
              additions,
              deletions
            })
          });
          console.log(`Stored code change for ${file_path}`);
        } catch (e) {
          console.error('Failed to store code change:', e);
        }
      }
      
      return { 
        result: { 
          written: true, 
          path: file_path,
          originalSize: context.stagedFiles[file_path].original.length,
          newSize: content.length
        }, 
        context 
      };
    }

    case 'file_delete': {
      const { file_path, confirm } = args;
      
      if (!confirm) {
        return { result: { error: 'Deletion not confirmed. Set confirm: true to proceed.' }, context };
      }
      
      // Mark file for deletion with special marker
      context.stagedFiles[file_path] = { 
        original: context.stagedFiles[file_path]?.original || '', 
        modified: '__DELETE__' 
      };
      
      return { result: { deleted: true, path: file_path }, context };
    }

    case 'list_directory': {
      const { path = '.', recursive = false } = args;
      
      if (!context.currentRepo) {
        return { result: { error: 'No repository cloned. Use github_clone_repo first.' }, context };
      }
      
      const { owner, repo, branch } = context.currentRepo;
      
      if (recursive) {
        // Use tree API for recursive listing
        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
          { headers: githubHeaders }
        );
        const data = await response.json();
        
        if (data.message) {
          return { result: { error: data.message }, context };
        }
        
        const prefix = path === '.' ? '' : `${path}/`;
        const items = data.tree
          ?.filter((item: any) => item.path.startsWith(prefix))
          .map((item: any) => ({
            name: item.path.replace(prefix, '').split('/')[0],
            type: item.type === 'blob' ? 'file' : 'dir',
            path: item.path,
            size: item.size
          })) || [];
        
        // Deduplicate directories
        const seen = new Set();
        const uniqueItems = items.filter((item: any) => {
          const key = item.path;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        
        return { result: { path, items: uniqueItems.slice(0, 100), count: uniqueItems.length }, context };
      }
      
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path === '.' ? '' : path}?ref=${branch}`,
        { headers: githubHeaders }
      );
      const data = await response.json();
      
      if (data.message) {
        return { result: { error: data.message }, context };
      }
      
      const items = Array.isArray(data) ? data.map((item: any) => ({
        name: item.name,
        type: item.type === 'file' ? 'file' : 'dir',
        path: item.path,
        size: item.size
      })) : [{ name: data.name, type: data.type, path: data.path }];
      
      return { result: { path, items, count: items.length }, context };
    }

    case 'search_code': {
      const { query, file_extension } = args;
      
      if (!context.currentRepo) {
        return { result: { error: 'No repository cloned. Use github_clone_repo first.' }, context };
      }
      
      const { owner, repo } = context.currentRepo;
      
      let searchQuery = `${query} repo:${owner}/${repo}`;
      if (file_extension) {
        searchQuery += ` extension:${file_extension}`;
      }
      
      const response = await fetch(
        `https://api.github.com/search/code?q=${encodeURIComponent(searchQuery)}`,
        { headers: githubHeaders }
      );
      const data = await response.json();
      
      if (data.message) {
        return { result: { error: data.message }, context };
      }
      
      const results = (data.items || []).slice(0, 15).map((item: any) => ({
        file: item.path,
        url: item.html_url,
        repository: item.repository?.full_name
      }));
      
      return { result: { query, results, total: data.total_count }, context };
    }

    case 'generate_diff': {
      const { file_paths } = args;
      const diffs: string[] = [];
      let additions = 0;
      let deletions = 0;
      
      for (const path of file_paths) {
        const file = context.stagedFiles[path];
        if (file) {
          if (file.modified === '__DELETE__') {
            diffs.push(`--- a/${path}\n+++ /dev/null\n(file deleted)`);
            deletions += file.original.split('\n').length;
          } else if (file.original !== file.modified) {
            const diff = generateUnifiedDiff(path, file.original, file.modified);
            diffs.push(diff);
            
            // Count changes
            const diffLines = diff.split('\n');
            additions += diffLines.filter(l => l.startsWith('+')).length;
            deletions += diffLines.filter(l => l.startsWith('-')).length;
          }
        }
      }
      
      return { 
        result: { 
          diff: diffs.join('\n\n'),
          filesChanged: diffs.length,
          additions,
          deletions
        }, 
        context 
      };
    }

    case 'git_add_commit_push': {
      const { commit_message } = args;
      
      // Check for repo context
      if (!context.currentRepo) {
        return { 
          result: { 
            error: 'No repository cloned. Use github_clone_repo first.',
            hint: 'Run github_clone_repo to initialize your user branch before committing.'
          }, 
          context 
        };
      }
      
      // Check for staged files - CRITICAL: must use file_write first
      const stagedCount = Object.keys(context.stagedFiles).length;
      if (stagedCount === 0) {
        return { 
          result: { 
            error: 'No files staged for commit. You must use file_write to stage changes before committing.',
            hint: 'WORKFLOW: 1) file_read to get current content, 2) file_write to save your modifications, 3) git_add_commit_push to commit.',
            staged_files_count: 0,
            action_required: 'Use file_write to make code changes first. Do NOT just show code in text - that does NOT modify files.'
          }, 
          context 
        };
      }
      
      const { owner, repo } = context.currentRepo;
      // ALWAYS use branch from context - never from args
      const branch = context.currentRepo.branch;
      
      console.log(`Committing ${stagedCount} files to branch: ${branch}`);
      
      // Get the base branch's latest commit
      const refResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`,
        { headers: githubHeaders }
      );
      const refData = await refResponse.json();
      const baseSha = refData.object?.sha;
      
      if (!baseSha) {
        return { result: { error: `Could not get base commit SHA for branch: ${branch}` }, context };
      }
      
      // Get the base tree
      const commitResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/commits/${baseSha}`,
        { headers: githubHeaders }
      );
      const commitData = await commitResponse.json();
      const baseTreeSha = commitData.tree?.sha;
      
      // Create blobs for each modified file
      const treeItems = [];
      for (const [path, file] of Object.entries(context.stagedFiles)) {
        if (file.modified === '__DELETE__') {
          // For deletions, we don't add to the tree (file will be removed)
          treeItems.push({
            path,
            mode: '100644',
            type: 'blob',
            sha: null // null sha means delete
          });
        } else if (file.original !== file.modified) {
          const blobResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
            {
              method: 'POST',
              headers: { ...githubHeaders, 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: file.modified, encoding: 'utf-8' })
            }
          );
          const blobData = await blobResponse.json();
          treeItems.push({
            path,
            mode: '100644',
            type: 'blob',
            sha: blobData.sha
          });
        }
      }
      
      if (treeItems.length === 0) {
        return { result: { error: 'No actual changes to commit (files unchanged)' }, context };
      }
      
      // Create new tree
      const treeResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees`,
        {
          method: 'POST',
          headers: { ...githubHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems })
        }
      );
      const treeData = await treeResponse.json();
      
      // Create commit
      const newCommitResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/commits`,
        {
          method: 'POST',
          headers: { ...githubHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: commit_message,
            tree: treeData.sha,
            parents: [baseSha]
          })
        }
      );
      const newCommitData = await newCommitResponse.json();
      
      // Create or update branch
      const branchRef = `refs/heads/${branch}`;
      const checkBranchResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`,
        { headers: githubHeaders }
      );
      
      if (checkBranchResponse.status === 404) {
        // Create new branch
        await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/refs`,
          {
            method: 'POST',
            headers: { ...githubHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ref: branchRef, sha: newCommitData.sha })
          }
        );
      } else {
        // Update existing branch
        await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
          {
            method: 'PATCH',
            headers: { ...githubHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ sha: newCommitData.sha, force: true })
          }
        );
      }
      
      // Clear staged files after successful commit
      context.stagedFiles = {};
      
      return {
        result: { 
          success: true,
          branch, 
          commitSha: newCommitData.sha,
          filesCommitted: treeItems.length
        },
        context
      };
    }

    case 'vercel_create_project': {
      const { name, repo, framework = 'vite' } = args;
      
      // Parse repo if it's a full URL
      let repoPath = repo;
      const match = repo.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
      if (match) {
        repoPath = `${match[1]}/${match[2].replace('.git', '')}`;
      }
      
      const projectName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
      
      const response = await fetch('https://api.vercel.com/v9/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: projectName,
          framework,
          gitRepository: { type: 'github', repo: repoPath }
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        return { result: { error: data.error.message || data.error }, context };
      }
      
      context.lastVercelProjectId = data.id;
      
      return {
        result: {
          success: true,
          projectId: data.id,
          name: data.name,
          framework: data.framework,
          accountId: data.accountId
        },
        context
      };
    }

    case 'vercel_trigger_deployment': {
      // Use context values by default, fall back to args
      const projectIdToUse = args.project_id || context.lastVercelProjectId;
      const branchToUse = args.branch || context.currentRepo?.branch || 'main';
      
      if (!projectIdToUse) {
        return {
          result: {
            error: 'No Vercel project ID available. The project may not be connected to Vercel yet.',
            hint: 'Use vercel_create_project to set up Vercel deployment first.'
          },
          context
        };
      }
      
      console.log(`Triggering Vercel deployment: project=${projectIdToUse}, branch=${branchToUse}`);
      
      // First fetch project data to get repoId
      const projectResponse = await fetch(
        `https://api.vercel.com/v9/projects/${projectIdToUse}`,
        { headers: { 'Authorization': `Bearer ${vercelToken}` } }
      );
      const projectData = await projectResponse.json();
      
      if (projectData.error) {
        return { result: { error: projectData.error.message }, context };
      }
      
      const deploymentBody: any = {
        name: projectIdToUse,
        project: projectIdToUse
      };
      
      // Only add gitSource if we have the required repoId
      if (projectData.link?.repoId) {
        deploymentBody.gitSource = {
          type: 'github',
          ref: branchToUse,
          repoId: projectData.link.repoId
        };
      }
      
      const response = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deploymentBody)
      });
      
      const data = await response.json();
      
      if (data.error) {
        return { result: { error: data.error.message }, context };
      }
      
      context.lastDeploymentId = data.id;
      context.lastVercelProjectId = projectIdToUse;
      
      return {
        result: { 
          deploymentId: data.id, 
          url: data.url,
          inspectorUrl: data.inspectorUrl,
          status: data.status,
          branch: branchToUse
        },
        context
      };
    }

    case 'vercel_get_deployment_status': {
      const { deployment_id } = args;
      
      const response = await fetch(
        `https://api.vercel.com/v13/deployments/${deployment_id}`,
        { headers: { 'Authorization': `Bearer ${vercelToken}` } }
      );
      
      const data = await response.json();
      
      if (data.error) {
        return { result: { error: data.error.message }, context };
      }
      
      // Get build logs if deployment failed
      let buildLogs = null;
      if (data.readyState === 'ERROR') {
        try {
          const logsResponse = await fetch(
            `https://api.vercel.com/v2/deployments/${deployment_id}/events`,
            { headers: { 'Authorization': `Bearer ${vercelToken}` } }
          );
          const logsData = await logsResponse.json();
          buildLogs = logsData.slice(-20).map((e: any) => e.text || e.payload?.text).filter(Boolean).join('\n');
        } catch (e) {
          console.error('Failed to fetch build logs:', e);
        }
      }
      
      return {
        result: { 
          status: data.readyState,
          url: data.url,
          ready: data.readyState === 'READY',
          error: data.readyState === 'ERROR',
          buildLogs
        },
        context
      };
    }

    case 'get_build_logs': {
      const { deployment_id, log_type = 'build' } = args;
      
      const response = await fetch(
        `https://api.vercel.com/v2/deployments/${deployment_id}/events`,
        { headers: { 'Authorization': `Bearer ${vercelToken}` } }
      );
      
      if (!response.ok) {
        return { result: { error: `Failed to fetch logs: ${response.status}` }, context };
      }
      
      const events = await response.json();
      
      const logs = events
        .filter((e: any) => log_type === 'build' ? e.type === 'stdout' || e.type === 'stderr' : e.type === 'runtime')
        .slice(-100)
        .map((e: any) => e.text || e.payload?.text)
        .filter(Boolean)
        .join('\n');
      
      return { result: { deployment_id, log_type, logs, eventCount: events.length }, context };
    }

    case 'capture_screenshot': {
      const { 
        url, 
        viewport_width = 1280, 
        viewport_height = 720, 
        full_page = false,
        selector
      } = args;
      
      // Use Google PageSpeed Insights API for screenshots (free, no API key needed)
      try {
        const strategy = viewport_width <= 768 ? 'mobile' : 'desktop';
        const apiUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
        apiUrl.searchParams.set('url', url);
        apiUrl.searchParams.set('strategy', strategy);
        apiUrl.searchParams.set('category', 'performance');
        
        const response = await fetch(apiUrl.toString());
        const data = await response.json();
        
        // Extract the screenshot from the audit
        const screenshot = data.lighthouseResult?.audits?.['final-screenshot']?.details?.data;
        const fullPageScreenshot = data.lighthouseResult?.audits?.['full-page-screenshot']?.details?.screenshot?.data;
        
        if (!screenshot && !fullPageScreenshot) {
          return { 
            result: { 
              error: 'Could not capture screenshot via PageSpeed API',
              url,
              suggestion: 'Visit the URL directly or use analyze_visual_element when the user selects an element.',
              api_error: data.error?.message
            }, 
            context 
          };
        }
        
        return {
          result: {
            screenshot_base64: full_page && fullPageScreenshot ? fullPageScreenshot : screenshot,
            url,
            strategy,
            viewport_width,
            viewport_height,
            captured_at: new Date().toISOString(),
            performance_score: data.lighthouseResult?.categories?.performance?.score,
            first_contentful_paint: data.lighthouseResult?.audits?.['first-contentful-paint']?.displayValue,
            largest_contentful_paint: data.lighthouseResult?.audits?.['largest-contentful-paint']?.displayValue
          },
          context
        };
      } catch (e: any) {
        return { 
          result: { 
            error: `Screenshot capture failed: ${e.message}`,
            url,
            suggestion: 'Visit the URL directly or use analyze_visual_element when the user selects an element.'
          }, 
          context 
        };
      }
    }

    case 'analyze_visual_element': {
      const { selector, element_html, computed_styles, bounding_box, user_request, text_content } = args;
      
      // Parse styles if provided as string
      let styles = {};
      try {
        styles = computed_styles ? JSON.parse(computed_styles) : {};
      } catch (e) {
        styles = { raw: computed_styles };
      }
      
      // Parse bounding box if provided
      let box = {};
      try {
        box = bounding_box ? JSON.parse(bounding_box) : {};
      } catch (e) {
        box = { raw: bounding_box };
      }
      
      // Build analysis context
      const analysis = {
        selector,
        element_summary: {
          html_preview: element_html?.substring(0, 500),
          text_content: text_content?.substring(0, 200),
          styles,
          dimensions: box
        },
        user_request,
        recommendations: [
          'Use search_code to find the component file containing this element',
          'Look for the CSS selector or className in the codebase',
          'After finding the file, use file_read to get full context',
          'Make minimal changes to address the user request'
        ]
      };
      
      return { result: analysis, context };
    }

    case 'github_create_pull_request': {
      const { repo_url, head_branch, base_branch, title, body = '' } = args;
      
      // Parse repo_url
      const match = repo_url.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
      if (!match) {
        return { result: { error: 'Invalid GitHub URL format' }, context };
      }
      
      const [, owner, repo] = match;
      
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls`,
        {
          method: 'POST',
          headers: { ...githubHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            title, 
            body, 
            head: head_branch, 
            base: base_branch 
          })
        }
      );
      
      const data = await response.json();
      
      if (data.errors || data.message) {
        return { result: { error: data.message || data.errors?.[0]?.message }, context };
      }
      
      return {
        result: { 
          prNumber: data.number, 
          prUrl: data.html_url,
          state: data.state
        },
        context
      };
    }

    default:
      return { result: { error: `Unknown tool: ${toolName}` }, context };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      message, 
      conversationId, 
      projectId, 
      history = [], 
      githubRepo, 
      visualContext,
      mode = 'execution',
      userId 
    } = await req.json();
    
    console.log('AI Agent received request:', { 
      message, 
      conversationId, 
      projectId, 
      githubRepo, 
      hasVisualContext: !!visualContext,
      mode,
      userId: userId?.substring(0, 8) 
    });
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Load existing session from database
    let existingSession = null;
    let vercelProjectIdFromDb: string | null = null;
    
    if (supabaseUrl && supabaseKey && projectId && userId) {
      existingSession = await loadAgentSession(supabaseUrl, supabaseKey, projectId, userId);
      console.log('Loaded existing session:', existingSession ? 'found' : 'none');
      
      // Also fetch Vercel project ID from projects table
      try {
        const projectResponse = await fetch(
          `${supabaseUrl}/rest/v1/projects?id=eq.${projectId}&select=vercel_project_id`,
          {
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey,
            }
          }
        );
        const projectData = await projectResponse.json();
        if (projectData?.[0]?.vercel_project_id) {
          vercelProjectIdFromDb = projectData[0].vercel_project_id;
          console.log('Loaded Vercel project ID from DB:', vercelProjectIdFromDb);
        }
      } catch (e) {
        console.error('Failed to load Vercel project ID:', e);
      }
    }
    
    // Parse service account
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    }
    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectIdGoogle = serviceAccount.project_id;
    
    // Get access token
    const accessToken = await getGoogleAccessToken(serviceAccount);
    
    // Initialize tool context from existing session
    let toolContext: ToolContext = { 
      stagedFiles: existingSession?.staged_files || {},
      projectId,
      conversationId,
      userId
    };
    
    // Restore repo context from session
    if (existingSession?.github_owner && existingSession?.github_repo) {
      toolContext.currentRepo = {
        owner: existingSession.github_owner,
        repo: existingSession.github_repo,
        branch: existingSession.current_branch || 'main'
      };
    }
    
    // Set Vercel project ID from projects table (priority) or session
    if (vercelProjectIdFromDb) {
      toolContext.lastVercelProjectId = vercelProjectIdFromDb;
    } else if (existingSession?.vercel_project_id) {
      toolContext.lastVercelProjectId = existingSession.vercel_project_id;
    }
    
    // Auto-clone if repo provided but not in context
    if (githubRepo && !toolContext.currentRepo) {
      console.log('Auto-cloning repository for context:', githubRepo);
      try {
        const { result, context: newContext } = await executeTool('github_clone_repo', { 
          repo_url: githubRepo, 
          branch: 'main' 
        }, toolContext);
        toolContext = newContext;
        console.log('Auto-clone result:', result.cloned ? 'success' : 'failed', 'branch:', toolContext.currentRepo?.branch);
      } catch (e) {
        console.error('Auto-clone failed:', e);
      }
    }

    // Count staged files for context
    const stagedFilesCount = Object.keys(toolContext.stagedFiles).length;
    const stagedFilesList = Object.keys(toolContext.stagedFiles);

    // Mode-specific instructions
    const modeInstructions = mode === 'chat' 
      ? `## CHAT MODE - PLANNING AND ANALYSIS
You are in CHAT mode for planning and discussion.

ALLOWED actions (you CAN use these tools):
- github_clone_repo - Clone/access repository to understand the codebase
- file_read - Read files to analyze code
- search_code - Search for code patterns
- list_directory - Explore project structure
- generate_diff - Preview what changes would look like
- capture_screenshot - Take screenshots for visual analysis
- analyze_visual_element - Analyze selected elements
- vercel_get_deployment_status - Check deployment status
- get_build_logs - View build logs

BLOCKED actions (do NOT attempt these - tell user to switch to Execute mode):
- file_write, file_delete
- git_add_commit_push
- vercel_create_project, vercel_trigger_deployment
- github_create_pull_request

START by cloning the repo if not already done, then analyze code and discuss plans.
If the user asks to make changes, explain what you WOULD do and ask them to switch to Execute mode.`
      : `## EXECUTION MODE - FULL ACCESS
You are in EXECUTION mode with full tool access.

### CRITICAL: HOW TO MAKE CODE CHANGES
**You MUST use the file_write tool to make ANY code changes.**
Just showing code in your text response does NOT modify files!

**CORRECT WORKFLOW (follow exactly):**
1. Clone repo if needed → \`github_clone_repo\` (branch is auto-created)
2. Read the file first → \`file_read\` (REQUIRED before writing)
3. **MAKE CHANGES using \`file_write\`** → This stages the file for commit
4. Show diff to user → \`generate_diff\`
5. Commit changes → \`git_add_commit_push\` (do NOT pass branch argument)

**COMMON MISTAKES - DO NOT DO:**
❌ Showing code in markdown and saying "here are the changes" - this does NOTHING
❌ Describing what to change without calling file_write
❌ Asking the user to make changes themselves
❌ Using git_add_commit_push before using file_write

**CORRECT APPROACH:**
✅ Read file → Modify content → Call file_write → Show diff → Commit

**Current staged files: ${stagedFilesCount}**
${stagedFilesCount > 0 
  ? `Files ready to commit:\n${stagedFilesList.map(f => `  - ${f}`).join('\n')}`
  : '(none - use file_write to stage changes before committing)'}

Always push to your user branch (never directly to main).`;

    // Build comprehensive system prompt per specification
    // NOTE: This is built AFTER auto-clone so toolContext.currentRepo is populated
    const systemPrompt = `You are an autonomous AI coding agent for Product Compass, a collaborative product development platform. Your role is to translate natural language requests into precise code changes, deploy previews, and facilitate team approvals.

${modeInstructions}

## CRITICAL BRANCH RULES - READ CAREFULLY
- Your working branch is: ${toolContext.currentRepo?.branch || '(will be auto-created when you clone)'}
- **NEVER ask the user which branch to use** - it is ALREADY SET automatically
- **NEVER ask the user to create a branch** - branches are AUTOMATIC
- When you clone a repository, your personal user branch is created automatically
- When you commit with git_add_commit_push, use NO branch argument - it uses your current branch automatically
- You MUST NOT push to main - only to your auto-assigned user branch
- The branch in your context is the ONLY branch you should use

## Core Behaviors

1. **Minimal Changes Only**: When modifying code, make the smallest possible changes that accomplish the request. Never refactor unrelated code or add unrequested features.

2. **Context Awareness**: Before editing, always read relevant files to understand the existing patterns, imports, and coding style. Match the project's conventions.

3. **React/TypeScript Focus**: The codebase uses React, TypeScript, and Tailwind CSS. Generate code that follows these patterns and includes proper type annotations.

4. **Error Recovery**: If a deployment fails, analyze the Vercel build logs, identify the issue, and attempt a fix automatically (up to 3 retries). Report to the user only after exhausting retries.

5. **Clear Communication**: Always explain what you're doing in concise, non-technical language. Show diffs in a readable format before committing.

## Workflow

For each user request:
1. Acknowledge the request and explain your plan
2. If no repo context, clone the repo (branch is auto-created, don't ask user)
3. Read relevant files to understand context
4. Generate minimal code changes
5. Show the diff to the user for feedback
6. If approved, commit and push changes using git_add_commit_push (do NOT specify branch - it uses current automatically)
7. Vercel will automatically deploy the branch
8. Report when changes are pushed
9. On approval, create GitHub Pull Request to merge to main

## Available Tools (15 total)

### Repository Tools
- github_clone_repo - Clone repository (auto-creates your user branch - NEVER ASK USER ABOUT BRANCHES)
- file_read - Read file contents (always do this before writing)
- file_write - Create or modify files
- file_delete - Remove files (requires confirmation)
- list_directory - Browse directory structure
- search_code - Find code patterns across the repo
- generate_diff - Preview changes before committing
- git_add_commit_push - Commit and push changes (uses current branch automatically - DO NOT pass branch argument)

### Vercel Tools
- vercel_create_project - Create new Vercel project from GitHub repo
- vercel_trigger_deployment - Deploy the project
- vercel_get_deployment_status - Check deployment progress
- get_build_logs - Analyze build failures in detail

### Visual Inspection Tools
- capture_screenshot - Take screenshots of deployed sites
- analyze_visual_element - Process user-selected elements from the preview

### GitHub Integration
- github_create_pull_request - Create PR for review (only when user wants to merge to main)

## Visual Editing Workflow

When the user sends a message with visual element context (they selected an element in the preview):
1. Parse the element info (selector, styles, HTML) from the context
2. Use search_code to find the component file containing this element
3. Use file_read to get the full component code
4. Identify the specific JSX that renders this element
5. Make targeted changes based on user request
6. Show diff and push for automatic deployment

## Safety Rules

- Never delete files unless explicitly requested
- Never expose API keys or secrets in code
- Never modify .env files or configuration that could break the build
- If a request seems destructive, ask for confirmation first
- Always push to user branches, never directly to main

## Current Context
- GitHub Repository: ${toolContext.currentRepo ? `https://github.com/${toolContext.currentRepo.owner}/${toolContext.currentRepo.repo}` : (githubRepo || 'Not connected')}
- Current Branch: ${toolContext.currentRepo?.branch || '(auto-created on clone)'}
- Vercel Project ID: ${toolContext.lastVercelProjectId || 'Not configured'}
- Staged Files: ${stagedFilesCount} files ready to commit${stagedFilesCount > 0 ? ` (${stagedFilesList.join(', ')})` : ''}
- Project ID: ${projectId}
- Conversation ID: ${conversationId}

## DEPLOYMENT RULES - CRITICAL
**YOUR DEPLOYMENT CONTEXT:**
- Vercel Project ID: ${toolContext.lastVercelProjectId || 'NOT CONFIGURED'}
- Deployment Branch: ${toolContext.currentRepo?.branch || 'NOT SET'}

**IMPORTANT FACTS:**
1. You CAN deploy EXISTING code on a branch - no new changes required
2. The branch "${toolContext.currentRepo?.branch || 'user branch'}" ALREADY EXISTS on GitHub with code
3. Staged files count (${stagedFilesCount}) is for NEW changes only - NOT required for deployment
4. To deploy, call vercel_trigger_deployment with NO arguments - it auto-uses your context

**WHEN USER SAYS "deploy" or "deploy the project":**
→ Do NOT ask for branch name or project ID
→ Do NOT say you need to push changes first (unless user asked you to make code changes)
→ IMMEDIATELY call: vercel_trigger_deployment() with no arguments
→ The tool automatically uses: project=${toolContext.lastVercelProjectId}, branch=${toolContext.currentRepo?.branch}

**NEVER SAY THESE THINGS:**
❌ "I need a branch to deploy to"
❌ "Please create a branch"  
❌ "I need to push changes first"
❌ "I am unable to create a branch"
❌ "What branch would you like to deploy?"

**CORRECT BEHAVIOR FOR "deploy the project":**
✅ Immediately call vercel_trigger_deployment tool with empty arguments
${visualContext ? `
## Visual Element Context (User selected this element)
- Selector: ${visualContext.selector}
- Text Content: ${visualContext.textContent || 'N/A'}
- Current Styles: ${JSON.stringify(visualContext.computedStyles || {})}
` : ''}`;

    // Build the initial user message, incorporating visual context if present
    let userMessage = message;
    if (visualContext) {
      userMessage = `[Visual Element Selected]
Selector: ${visualContext.selector}
Tag: ${visualContext.tagName}
Classes: ${visualContext.className}
Text: ${visualContext.textContent?.substring(0, 100) || 'N/A'}
Styles: ${JSON.stringify(visualContext.computedStyles || {}, null, 2)}

User Request: ${message}`;
    }

    // ==========================================
    // PHASE M: DEPLOY INTENT SHORTCUT
    // Bypass LLM entirely for deploy commands
    // ==========================================
    const deployIntentPatterns = [
      /^deploy$/i,
      /^deploy\s+(the\s+)?project$/i,
      /^deploy\s+(this|it|now)$/i,
      /^trigger\s+deploy(ment)?$/i,
      /^start\s+deploy(ment)?$/i
    ];
    
    const isDeployIntent = deployIntentPatterns.some(p => p.test(message.trim()));
    
    console.log('[Deploy Shortcut] Checking deploy intent:', {
      message: message.trim(),
      isDeployIntent,
      mode,
      vercelProjectId: toolContext.lastVercelProjectId,
      branch: toolContext.currentRepo?.branch
    });
    
    if (isDeployIntent && mode === 'execution') {
      console.log('[Deploy Shortcut] TRIGGERED - bypassing LLM');
      
      // Check if we have required context
      if (!toolContext.lastVercelProjectId) {
        return new Response(
          JSON.stringify({
            response: "Cannot deploy: No Vercel project configured for this project. Please set up Vercel integration first.",
            success: false,
            mode,
            shortcut: 'deploy_no_vercel'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const deployBranch = toolContext.currentRepo?.branch || 'main';
      console.log(`[Deploy Shortcut] Deploying project=${toolContext.lastVercelProjectId} branch=${deployBranch}`);
      
      // Execute deployment directly
      const { result: deployResult, context: updatedContext } = await executeTool(
        'vercel_trigger_deployment',
        { project_id: toolContext.lastVercelProjectId, branch: deployBranch },
        toolContext
      );
      
      console.log('[Deploy Shortcut] Deployment result:', deployResult);
      
      // Save session
      if (supabaseUrl && supabaseKey && projectId && userId) {
        await saveAgentSession(supabaseUrl, supabaseKey, projectId, userId, updatedContext, mode);
      }
      
      // Format response
      let responseText: string;
      if (deployResult.error) {
        responseText = `Deployment failed: ${deployResult.error}`;
      } else {
        responseText = `🚀 **Deployment triggered successfully!**\n\n` +
          `- **Branch:** ${deployBranch}\n` +
          `- **Deployment ID:** ${deployResult.deploymentId || 'pending'}\n` +
          `- **Status:** ${deployResult.status || 'queued'}\n` +
          (deployResult.url ? `- **Preview URL:** ${deployResult.url}\n` : '') +
          `\nVercel is now building your project. The preview URL will be available once the build completes.`;
      }
      
      return new Response(
        JSON.stringify({
          response: responseText,
          success: !deployResult.error,
          mode,
          branch: deployBranch,
          shortcut: 'deploy_executed',
          deploymentId: deployResult.deploymentId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // ==========================================
    // END DEPLOY SHORTCUT
    // ==========================================

    // Build messages for LLM (Phase L: use systemInstruction instead of user message)
    const messages: any[] = [
      ...history.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      { role: 'user', parts: [{ text: userMessage }] }
    ];

    // Filter tools based on mode
    const activeTools = mode === 'chat'
      ? toolDefinitions.filter(t => chatModeTools.includes(t.name))
      : toolDefinitions;
    
    console.log(`Mode: ${mode}, Active tools: ${activeTools.length}`);

    let finalResponse = '';
    let iterations = 0;
    const maxIterations = 15;
    let deploymentRetries = 0;
    const maxDeploymentRetries = 3;

    // Agentic loop - keep processing until no more tool calls
    while (iterations < maxIterations) {
      iterations++;
      console.log(`Agent iteration ${iterations}`);
      
      // Call Vertex AI
      const vertexUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectIdGoogle}/locations/us-central1/publishers/google/models/gemini-2.0-flash:generateContent`;
      
      const vertexResponse = await fetch(vertexUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Phase L: Use systemInstruction for authoritative system prompt
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: messages,
          tools: [{ functionDeclarations: activeTools }],
          toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192
          }
        })
      });

      const vertexData = await vertexResponse.json();
      console.log('Vertex AI response:', JSON.stringify(vertexData).substring(0, 1000));
      
      if (vertexData.error) {
        throw new Error(`Vertex AI error: ${vertexData.error.message}`);
      }

      const candidate = vertexData.candidates?.[0];
      if (!candidate) {
        throw new Error('No response from Vertex AI');
      }

      const parts = candidate.content?.parts || [];
      let hasToolCalls = false;
      const toolResults: any[] = [];

      for (const part of parts) {
        if (part.text) {
          finalResponse += part.text;
        }
        
        if (part.functionCall) {
          hasToolCalls = true;
          const { name, args } = part.functionCall;
          
          console.log(`Tool call: ${name}`, args);
          
          // Double-check mode enforcement (belt and suspenders)
          if (mode === 'chat' && !chatModeTools.includes(name)) {
            toolResults.push({
              functionResponse: {
                name,
                response: { 
                  error: `Tool "${name}" is not available in Chat mode. Switch to Execute mode to use this tool.`,
                  blocked: true,
                  mode: 'chat'
                }
              }
            });
            continue;
          }
          
          const { result, context } = await executeTool(name, args || {}, toolContext);
          toolContext = context;
          
          // Check for deployment failure and trigger retry logic
          if (name === 'vercel_get_deployment_status' && result.error && deploymentRetries < maxDeploymentRetries) {
            deploymentRetries++;
            console.log(`Deployment failed, retry ${deploymentRetries}/${maxDeploymentRetries}`);
            
            // Add error context for AI to analyze
            toolResults.push({
              functionResponse: {
                name,
                response: {
                  ...result,
                  retryHint: `This is retry ${deploymentRetries}/${maxDeploymentRetries}. Analyze the build logs and attempt to fix the issue automatically.`
                }
              }
            });
          } else {
            toolResults.push({
              functionResponse: {
                name,
                response: result
              }
            });
          }
        }
      }

      // Add assistant response to messages
      messages.push({ role: 'model', parts });

      // If there were tool calls, add the results and continue
      if (hasToolCalls && toolResults.length > 0) {
        messages.push({ role: 'user', parts: toolResults });
      } else {
        // No more tool calls, we're done
        break;
      }
    }

    // Save session back to database
    if (supabaseUrl && supabaseKey && projectId && userId) {
      await saveAgentSession(supabaseUrl, supabaseKey, projectId, userId, toolContext, mode);
      console.log('Saved agent session');
    }

    console.log('Agent completed with final response:', finalResponse.substring(0, 200));

    return new Response(
      JSON.stringify({ 
        response: finalResponse,
        iterations,
        success: true,
        mode,
        branch: toolContext.currentRepo?.branch
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('AI Agent error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
