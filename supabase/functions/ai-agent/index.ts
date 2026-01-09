import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    description: 'Write or update a file and IMMEDIATELY push to GitHub. Each call creates a commit. Use this for ALL code changes.',
    parameters: {
      type: 'OBJECT',
      properties: {
        file_path: { type: 'STRING', description: 'Relative path to the file from repo root' },
        content: { type: 'STRING', description: 'Complete new content for the file' },
        commit_message: { type: 'STRING', description: 'Commit message (optional, auto-generated if not provided)' }
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
    name: 'analyze_dependencies',
    description: 'Analyze a file for imports and validate against package.json. Returns missing dependencies that need to be installed. ALWAYS use this before file_write when adding new imports.',
    parameters: {
      type: 'OBJECT',
      properties: {
        file_path: { type: 'STRING', description: 'File to analyze for imports' },
        content: { type: 'STRING', description: 'File content to check (if not provided, reads from GitHub)' }
      },
      required: ['file_path']
    }
  },
  {
    name: 'add_dependency',
    description: 'Add a package to package.json dependencies and push the change. Use this when analyze_dependencies reports missing packages.',
    parameters: {
      type: 'OBJECT',
      properties: {
        package_name: { type: 'STRING', description: 'NPM package name (e.g., "react-i18next")' },
        version: { type: 'STRING', description: 'Version (default: "latest")' },
        dev: { type: 'BOOLEAN', description: 'Add to devDependencies instead (default: false)' }
      },
      required: ['package_name']
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
    description: 'Retrieve detailed build logs from a Vercel deployment. Use to diagnose build failures and extract specific error messages.',
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
  },
  {
    name: 'autonomous_deploy_and_verify',
    description: 'Trigger deployment and autonomously monitor, diagnose, and fix any build errors. Use this after making changes to deploy and verify they work.',
    parameters: {
      type: 'OBJECT',
      properties: {
        max_retries: { type: 'NUMBER', description: 'Maximum fix attempts (default: 5)' }
      },
      required: []
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
  'get_build_logs',
  'analyze_dependencies'
];

// Generate unified diff for file changes
function generateUnifiedDiff(path: string, original: string, modified: string): string {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  
  let diff = `--- a/${path}\n+++ b/${path}\n`;
  
  let i = 0;
  while (i < Math.max(originalLines.length, modifiedLines.length)) {
    const origLine = originalLines[i] ?? null;
    const modLine = modifiedLines[i] ?? null;
    
    if (origLine !== modLine) {
      const hunkStart = Math.max(0, i - 2);
      let hunkEnd = i;
      
      while (hunkEnd < Math.max(originalLines.length, modifiedLines.length)) {
        const o = originalLines[hunkEnd] ?? null;
        const m = modifiedLines[hunkEnd] ?? null;
        if (o === m) {
          let matches = 0;
          for (let j = 0; j < 3 && hunkEnd + j < Math.max(originalLines.length, modifiedLines.length); j++) {
            if (originalLines[hunkEnd + j] === modifiedLines[hunkEnd + j]) matches++;
          }
          if (matches >= 3) break;
        }
        hunkEnd++;
      }
      hunkEnd = Math.min(hunkEnd + 2, Math.max(originalLines.length, modifiedLines.length));
      
      diff += `@@ -${hunkStart + 1},${Math.min(hunkEnd - hunkStart, originalLines.length - hunkStart)} +${hunkStart + 1},${Math.min(hunkEnd - hunkStart, modifiedLines.length - hunkStart)} @@\n`;
      
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

// Parse build errors from logs
function parseBuildError(logs: string): {
  type: 'missing_module' | 'typescript' | 'syntax' | 'import' | 'unknown';
  module?: string;
  file?: string;
  line?: number;
  message: string;
  actionable: boolean;
} {
  // Pattern: Cannot find module 'X'
  const missingModule = logs.match(/Cannot find module ['"]([^'"]+)['"]/);
  if (missingModule) {
    return {
      type: 'missing_module',
      module: missingModule[1],
      message: `Missing dependency: ${missingModule[1]}`,
      actionable: true
    };
  }
  
  // Pattern: Module not found: Can't resolve 'X'
  const cantResolve = logs.match(/Module not found:.*Can't resolve ['"]([^'"]+)['"]/);
  if (cantResolve) {
    return {
      type: 'missing_module',
      module: cantResolve[1],
      message: `Missing dependency: ${cantResolve[1]}`,
      actionable: true
    };
  }
  
  // Pattern: Could not resolve 'X'
  const couldNotResolve = logs.match(/Could not resolve ['"]([^'"]+)['"]/);
  if (couldNotResolve) {
    return {
      type: 'missing_module',
      module: couldNotResolve[1],
      message: `Missing dependency: ${couldNotResolve[1]}`,
      actionable: true
    };
  }
  
  // Pattern: TS2304: Cannot find name 'X'
  const tsError = logs.match(/TS\d+:\s*(.+?)(?:\n|$)/);
  if (tsError) {
    const fileMatch = logs.match(/(\S+\.tsx?):(\d+):\d+/);
    return {
      type: 'typescript',
      message: tsError[1],
      file: fileMatch?.[1],
      line: fileMatch ? parseInt(fileMatch[2]) : undefined,
      actionable: true
    };
  }
  
  // Pattern: SyntaxError
  const syntaxError = logs.match(/SyntaxError:\s*(.+?)(?:\n|$)/);
  if (syntaxError) {
    return {
      type: 'syntax',
      message: syntaxError[1],
      actionable: true
    };
  }
  
  // Pattern: import error
  const importError = logs.match(/does not provide an export named ['"]([^'"]+)['"]/);
  if (importError) {
    return {
      type: 'import',
      message: `Named export '${importError[1]}' not found`,
      actionable: true
    };
  }
  
  // Fallback
  const errorLines = logs.split('\n').filter(l => 
    l.toLowerCase().includes('error') || 
    l.includes('failed') ||
    l.includes('Cannot')
  ).slice(0, 5);
  
  return {
    type: 'unknown',
    message: errorLines.join('\n') || 'Build failed with unknown error',
    actionable: false
  };
}

// Extract package name from import path
function getPackageName(importPath: string): string | null {
  // Skip relative imports
  if (importPath.startsWith('.') || importPath.startsWith('/')) {
    return null;
  }
  
  // Skip path aliases
  if (importPath.startsWith('@/') || importPath.startsWith('~')) {
    return null;
  }
  
  // Scoped packages: @scope/package
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
  }
  
  // Regular packages: package or package/subpath
  return importPath.split('/')[0];
}

// Analyze imports in a file
function analyzeImports(content: string): string[] {
  const imports: Set<string> = new Set();
  
  // Match: import ... from 'package'
  const importFromRegex = /import\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = importFromRegex.exec(content)) !== null) {
    const pkg = getPackageName(match[1]);
    if (pkg) imports.add(pkg);
  }
  
  // Match: require('package')
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
    const pkg = getPackageName(match[1]);
    if (pkg) imports.add(pkg);
  }
  
  return Array.from(imports);
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
  packageJson?: any; // Cached package.json
  // For activity tracking
  supabaseUrl?: string;
  supabaseKey?: string;
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

// Emit real-time activity status for UI
async function emitActivity(
  supabaseUrl: string,
  supabaseKey: string,
  projectId: string,
  conversationId: string | undefined,
  activityType: string,
  status: 'in_progress' | 'complete' | 'error',
  details?: Record<string, any>
): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/rest/v1/agent_activity`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        project_id: projectId,
        conversation_id: conversationId || null,
        activity_type: activityType,
        status,
        details: details || null
      })
    });
  } catch (e) {
    console.error('Failed to emit activity:', e);
  }
}

// Atomic push to GitHub (creates a single commit for one file)
async function atomicGitHubPush(
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
  content: string,
  commitMessage: string,
  githubHeaders: Record<string, string>
): Promise<{ success: boolean; commitSha?: string; error?: string }> {
  try {
    // 1. Get branch HEAD
    const refResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`,
      { headers: githubHeaders }
    );
    
    if (!refResponse.ok) {
      return { success: false, error: `Branch ${branch} not found` };
    }
    
    const refData = await refResponse.json();
    const baseSha = refData.object?.sha;
    
    // 2. Get parent commit's tree
    const commitResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits/${baseSha}`,
      { headers: githubHeaders }
    );
    const commitData = await commitResponse.json();
    const baseTreeSha = commitData.tree?.sha;
    
    // 3. Create blob
    const blobResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
      {
        method: 'POST',
        headers: { ...githubHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, encoding: 'utf-8' })
      }
    );
    const blobData = await blobResponse.json();
    
    // 4. Create tree
    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees`,
      {
        method: 'POST',
        headers: { ...githubHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: [{
            path: filePath,
            mode: '100644',
            type: 'blob',
            sha: blobData.sha
          }]
        })
      }
    );
    const treeData = await treeResponse.json();
    
    // 5. Create commit
    const newCommitResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits`,
      {
        method: 'POST',
        headers: { ...githubHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: commitMessage,
          tree: treeData.sha,
          parents: [baseSha]
        })
      }
    );
    const newCommitData = await newCommitResponse.json();
    
    // 6. Update branch ref
    await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
      {
        method: 'PATCH',
        headers: { ...githubHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha: newCommitData.sha, force: false })
      }
    );
    
    return { success: true, commitSha: newCommitData.sha };
  } catch (e: any) {
    console.error('Atomic GitHub push failed:', e);
    return { success: false, error: e.message };
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
      
      const match = repo_url.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
      if (!match) {
        return { result: { error: 'Invalid GitHub URL format' }, context };
      }
      
      const [, owner, repo] = match;
      
      let targetBranch = branch;
      if (context.userId && branch === 'main') {
        const userPrefix = context.userId.substring(0, 8);
        targetBranch = `user/${userPrefix}`;
        
        const branchCheckRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${targetBranch}`,
          { headers: githubHeaders }
        );
        
        if (branchCheckRes.status === 404) {
          const mainRef = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/main`,
            { headers: githubHeaders }
          );
          const mainData = await mainRef.json();
          
          if (mainData.object?.sha) {
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
      
      const supabaseUrlEnv = Deno.env.get('SUPABASE_URL');
      const supabaseKeyEnv = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (supabaseUrlEnv && supabaseKeyEnv && context.projectId && context.userId) {
        await saveAgentSession(supabaseUrlEnv, supabaseKeyEnv, context.projectId, context.userId, context, 'execution');
        console.log(`Immediately saved session with branch: ${targetBranch}`);
      }
      
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`,
        { headers: githubHeaders }
      );
      const data = await response.json();
      
      if (data.message) {
        return { result: { error: data.message }, context };
      }
      
      const files = data.tree?.filter((f: any) => f.type === 'blob').map((f: any) => f.path) || [];
      
      // Cache package.json
      try {
        const pkgResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/package.json?ref=${targetBranch}`,
          { headers: githubHeaders }
        );
        if (pkgResponse.ok) {
          const pkgData = await pkgResponse.json();
          const pkgContent = atob(pkgData.content.replace(/\n/g, ''));
          context.packageJson = JSON.parse(pkgContent);
          console.log('Cached package.json with', Object.keys(context.packageJson.dependencies || {}).length, 'dependencies');
        }
      } catch (e) {
        console.error('Failed to cache package.json:', e);
      }
      
      return {
        result: { 
          cloned: true, 
          owner, 
          repo, 
          branch: targetBranch,
          fileCount: files.length,
          files: files.slice(0, 50),
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
      
      context.stagedFiles[file_path] = { original: content, modified: content };
      
      return { result: { path: file_path, content, size: data.size }, context };
    }

    case 'file_write': {
      const { file_path, content, commit_message } = args;
      
      if (!context.currentRepo) {
        return { result: { error: 'No repository cloned. Use github_clone_repo first.' }, context };
      }
      
      const { owner, repo, branch } = context.currentRepo;
      
      // Get original content for diff
      let originalContent = '';
      try {
        const existingRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${file_path}?ref=${branch}`,
          { headers: githubHeaders }
        );
        if (existingRes.ok) {
          const existingData = await existingRes.json();
          originalContent = atob(existingData.content.replace(/\n/g, ''));
        }
      } catch (e) {
        // New file
      }
      
      // Generate commit message
      const msg = commit_message || `Update ${file_path}`;
      
      // ATOMIC PUSH TO GITHUB
      console.log(`[file_write] Atomic push: ${file_path} to ${branch}`);
      const pushResult = await atomicGitHubPush(owner, repo, branch, file_path, content, msg, githubHeaders);
      
      if (!pushResult.success) {
        return { 
          result: { 
            error: `Failed to push to GitHub: ${pushResult.error}`,
            path: file_path
          }, 
          context 
        };
      }
      
      // Store for local tracking and UI display
      context.stagedFiles[file_path] = { original: originalContent, modified: content };
      
      // Record in database for UI display
      if (supabaseUrl && supabaseKey && context.projectId) {
        try {
          const diff = generateUnifiedDiff(file_path, originalContent, content);
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
              status: originalContent ? 'modified' : 'added',
              original_content: originalContent,
              modified_content: content,
              diff_content: diff,
              additions,
              deletions,
              commit_sha: pushResult.commitSha
            })
          });
          console.log(`Stored code change for ${file_path} with commit ${pushResult.commitSha}`);
        } catch (e) {
          console.error('Failed to store code change:', e);
        }
      }
      
      return { 
        result: { 
          written: true, 
          pushed: true,
          path: file_path,
          commitSha: pushResult.commitSha,
          branch,
          message: `File written and pushed to GitHub. Commit: ${pushResult.commitSha?.substring(0, 7)}`
        }, 
        context 
      };
    }

    case 'file_delete': {
      const { file_path, confirm } = args;
      
      if (!confirm) {
        return { result: { error: 'Deletion not confirmed. Set confirm: true to proceed.' }, context };
      }
      
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

    case 'analyze_dependencies': {
      const { file_path, content: providedContent } = args;
      
      if (!context.currentRepo) {
        return { result: { error: 'No repository cloned. Use github_clone_repo first.' }, context };
      }
      
      const { owner, repo, branch } = context.currentRepo;
      
      // Get file content
      let fileContent = providedContent;
      if (!fileContent) {
        const fileRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${file_path}?ref=${branch}`,
          { headers: githubHeaders }
        );
        if (fileRes.ok) {
          const fileData = await fileRes.json();
          fileContent = atob(fileData.content.replace(/\n/g, ''));
        }
      }
      
      if (!fileContent) {
        return { result: { error: `Could not read file: ${file_path}` }, context };
      }
      
      // Get or refresh package.json
      if (!context.packageJson) {
        try {
          const pkgRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/package.json?ref=${branch}`,
            { headers: githubHeaders }
          );
          if (pkgRes.ok) {
            const pkgData = await pkgRes.json();
            context.packageJson = JSON.parse(atob(pkgData.content.replace(/\n/g, '')));
          }
        } catch (e) {
          return { result: { error: 'Could not read package.json' }, context };
        }
      }
      
      const pkg = context.packageJson;
      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
        ...(pkg.peerDependencies || {})
      };
      
      // Analyze imports
      const imports = analyzeImports(fileContent);
      const missing: string[] = [];
      const found: string[] = [];
      
      for (const imp of imports) {
        // Check if it's a built-in or already installed
        if (allDeps[imp]) {
          found.push(imp);
        } else if (!['react', 'react-dom', 'path', 'fs', 'url', 'util', 'events', 'stream', 'crypto', 'http', 'https', 'os', 'child_process'].includes(imp)) {
          missing.push(imp);
        }
      }
      
      return {
        result: {
          file: file_path,
          imports,
          found,
          missing,
          hasMissingDeps: missing.length > 0,
          suggestion: missing.length > 0 
            ? `Missing packages: ${missing.join(', ')}. Use add_dependency to install them before writing the file.`
            : 'All dependencies are installed.'
        },
        context
      };
    }

    case 'add_dependency': {
      const { package_name, version = 'latest', dev = false } = args;
      
      if (!context.currentRepo) {
        return { result: { error: 'No repository cloned. Use github_clone_repo first.' }, context };
      }
      
      const { owner, repo, branch } = context.currentRepo;
      
      // Get current package.json
      const pkgRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/package.json?ref=${branch}`,
        { headers: githubHeaders }
      );
      
      if (!pkgRes.ok) {
        return { result: { error: 'Could not read package.json' }, context };
      }
      
      const pkgData = await pkgRes.json();
      const pkgContent = atob(pkgData.content.replace(/\n/g, ''));
      const pkg = JSON.parse(pkgContent);
      
      // Determine version to add
      let versionToAdd = version;
      if (version === 'latest') {
        try {
          const npmRes = await fetch(`https://registry.npmjs.org/${package_name}/latest`);
          if (npmRes.ok) {
            const npmData = await npmRes.json();
            versionToAdd = `^${npmData.version}`;
          } else {
            versionToAdd = '*';
          }
        } catch (e) {
          versionToAdd = '*';
        }
      }
      
      // Add to dependencies
      const depKey = dev ? 'devDependencies' : 'dependencies';
      if (!pkg[depKey]) {
        pkg[depKey] = {};
      }
      pkg[depKey][package_name] = versionToAdd;
      
      // Sort dependencies alphabetically
      pkg[depKey] = Object.fromEntries(
        Object.entries(pkg[depKey]).sort(([a], [b]) => a.localeCompare(b))
      );
      
      // Update package.json
      const newContent = JSON.stringify(pkg, null, 2) + '\n';
      
      // Atomic push
      const pushResult = await atomicGitHubPush(
        owner, repo, branch,
        'package.json',
        newContent,
        `Add ${package_name}@${versionToAdd} to ${depKey}`,
        githubHeaders
      );
      
      if (!pushResult.success) {
        return { result: { error: `Failed to update package.json: ${pushResult.error}` }, context };
      }
      
      // Update cached package.json
      context.packageJson = pkg;
      
      return {
        result: {
          added: true,
          package: package_name,
          version: versionToAdd,
          depType: depKey,
          commitSha: pushResult.commitSha,
          message: `Added ${package_name}@${versionToAdd} to ${depKey}. Vercel will install it on next build.`
        },
        context
      };
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
      
      if (!context.currentRepo) {
        return { 
          result: { 
            error: 'No repository cloned. Use github_clone_repo first.',
            hint: 'Run github_clone_repo to initialize your user branch before committing.'
          }, 
          context 
        };
      }
      
      // Note: With atomic file_write, this is now mainly for batch commits
      // Check for staged files that haven't been pushed yet
      const stagedCount = Object.keys(context.stagedFiles).length;
      if (stagedCount === 0) {
        return { 
          result: { 
            info: 'No additional changes to commit. Note: file_write now pushes immediately.',
            hint: 'Each file_write already creates a commit. This tool is mainly for batch operations.',
            staged_files_count: 0
          }, 
          context 
        };
      }
      
      const { owner, repo } = context.currentRepo;
      const branch = context.currentRepo.branch;
      
      console.log(`Committing ${stagedCount} files to branch: ${branch}`);
      
      const refResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`,
        { headers: githubHeaders }
      );
      const refData = await refResponse.json();
      const baseSha = refData.object?.sha;
      
      if (!baseSha) {
        return { result: { error: `Could not get base commit SHA for branch: ${branch}` }, context };
      }
      
      const commitResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/commits/${baseSha}`,
        { headers: githubHeaders }
      );
      const commitData = await commitResponse.json();
      const baseTreeSha = commitData.tree?.sha;
      
      const treeItems = [];
      for (const [path, file] of Object.entries(context.stagedFiles)) {
        if (file.modified === '__DELETE__') {
          treeItems.push({
            path,
            mode: '100644',
            type: 'blob',
            sha: null
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
      
      const treeResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees`,
        {
          method: 'POST',
          headers: { ...githubHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems })
        }
      );
      const treeData = await treeResponse.json();
      
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
      
      const checkBranchResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`,
        { headers: githubHeaders }
      );
      
      if (checkBranchResponse.status === 404) {
        await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/refs`,
          {
            method: 'POST',
            headers: { ...githubHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: newCommitData.sha })
          }
        );
      } else {
        await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
          {
            method: 'PATCH',
            headers: { ...githubHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ sha: newCommitData.sha, force: true })
          }
        );
      }
      
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
      let { name, repo, framework } = args;
      
      // Auto-detect framework from cached package.json if not specified
      if (!framework && context.packageJson) {
        const deps = {
          ...context.packageJson.dependencies,
          ...context.packageJson.devDependencies
        };
        if (deps['next']) framework = 'nextjs';
        else if (deps['vite']) framework = 'vite';
        else if (deps['gatsby']) framework = 'gatsby';
        else if (deps['nuxt']) framework = 'nuxt';
        else if (deps['svelte']) framework = 'svelte';
        else if (deps['vue']) framework = 'vue';
        else framework = 'vite'; // Default
        console.log(`[vercel_create_project] Auto-detected framework: ${framework}`);
      } else if (!framework) {
        framework = 'vite';
      }
      
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
      
      let buildLogs = null;
      let parsedError = null;
      if (data.readyState === 'ERROR') {
        try {
          const logsResponse = await fetch(
            `https://api.vercel.com/v2/deployments/${deployment_id}/events`,
            { headers: { 'Authorization': `Bearer ${vercelToken}` } }
          );
          const logsData = await logsResponse.json();
          buildLogs = logsData.slice(-50).map((e: any) => e.text || e.payload?.text).filter(Boolean).join('\n');
          parsedError = parseBuildError(buildLogs);
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
          buildLogs,
          parsedError,
          inspectorUrl: `https://vercel.com/deployments/${deployment_id}`
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
      
      const parsedError = parseBuildError(logs);
      
      return { 
        result: { 
          deployment_id, 
          log_type, 
          logs, 
          eventCount: events.length,
          parsedError,
          actionableInsight: parsedError.actionable 
            ? `Found actionable error: ${parsedError.message}. ${parsedError.type === 'missing_module' ? `Use add_dependency to install ${parsedError.module}` : 'Fix the error in the source file.'}`
            : null
        }, 
        context 
      };
    }

    case 'capture_screenshot': {
      const { 
        url, 
        viewport_width = 1280, 
        viewport_height = 720, 
        full_page = false,
        selector
      } = args;
      
      try {
        const strategy = viewport_width <= 768 ? 'mobile' : 'desktop';
        const apiUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
        apiUrl.searchParams.set('url', url);
        apiUrl.searchParams.set('strategy', strategy);
        apiUrl.searchParams.set('category', 'performance');
        
        const response = await fetch(apiUrl.toString());
        const data = await response.json();
        
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
      
      let styles = {};
      try {
        styles = computed_styles ? JSON.parse(computed_styles) : {};
      } catch (e) {
        styles = { raw: computed_styles };
      }
      
      let box = {};
      try {
        box = bounding_box ? JSON.parse(bounding_box) : {};
      } catch (e) {
        box = { raw: bounding_box };
      }
      
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

    case 'autonomous_deploy_and_verify': {
      const { max_retries = 5 } = args;
      
      // Helper to emit activity
      const emit = async (type: string, status: 'in_progress' | 'complete' | 'error', details?: Record<string, any>) => {
        if (context.supabaseUrl && context.supabaseKey && context.projectId) {
          await emitActivity(
            context.supabaseUrl,
            context.supabaseKey,
            context.projectId,
            context.conversationId,
            type,
            status,
            details
          );
        }
      };
      
      if (!context.lastVercelProjectId) {
        return { 
          result: { error: 'No Vercel project configured. Use vercel_create_project first.' }, 
          context 
        };
      }
      
      const branchToUse = context.currentRepo?.branch || 'main';
      
      // Emit deploying status
      await emit('deploying', 'in_progress', { attempt: 1, maxAttempts: max_retries });
      
      // Trigger initial deployment
      const { result: deployResult, context: ctx1 } = await executeTool(
        'vercel_trigger_deployment',
        { project_id: context.lastVercelProjectId, branch: branchToUse },
        context
      );
      context = ctx1;
      
      if (deployResult.error) {
        await emit('deploying', 'error', { error: deployResult.error });
        return { result: { error: `Deployment trigger failed: ${deployResult.error}` }, context };
      }
      
      const deploymentId = deployResult.deploymentId;
      let attempt = 0;
      let lastStatus = 'QUEUED';
      let finalUrl = deployResult.url;
      
      // Poll and auto-fix loop
      while (attempt < max_retries) {
        // Wait for build
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        await emit('checking_logs', 'in_progress');
        
        const { result: statusResult, context: ctx2 } = await executeTool(
          'vercel_get_deployment_status',
          { deployment_id: deploymentId },
          context
        );
        context = ctx2;
        
        lastStatus = statusResult.status;
        
        if (statusResult.ready) {
          await emit('checking_logs', 'complete');
          finalUrl = statusResult.url;
          
          // Take verification screenshot
          await emit('screenshot', 'in_progress');
          let screenshot = null;
          if (finalUrl) {
            try {
              const { result: ssResult } = await executeTool(
                'capture_screenshot',
                { url: `https://${finalUrl}` },
                context
              );
              screenshot = ssResult.screenshot_base64 ? 'captured' : null;
              await emit('screenshot', 'complete');
            } catch (e) {
              console.error('Screenshot failed:', e);
              await emit('screenshot', 'error');
            }
          }
          
          await emit('complete', 'complete', { message: `Deployment successful! Preview: https://${finalUrl}` });
          
          return {
            result: {
              success: true,
              status: 'READY',
              url: finalUrl,
              deploymentId,
              attempts: attempt + 1,
              screenshot,
              message: `Deployment successful! Preview: https://${finalUrl}`
            },
            context
          };
        }
        
        if (statusResult.error && statusResult.parsedError) {
          attempt++;
          await emit('checking_logs', 'complete');
          console.log(`[autonomous_deploy] Build failed, attempt ${attempt}/${max_retries}`);
          console.log(`[autonomous_deploy] Error: ${statusResult.parsedError.message}`);
          
          // Attempt auto-fix based on error type
          if (statusResult.parsedError.type === 'missing_module' && statusResult.parsedError.module) {
            await emit('fixing', 'in_progress', { error: `Missing module: ${statusResult.parsedError.module}` });
            console.log(`[autonomous_deploy] Auto-fixing: adding ${statusResult.parsedError.module}`);
            const { result: addResult, context: ctx3 } = await executeTool(
              'add_dependency',
              { package_name: statusResult.parsedError.module },
              context
            );
            context = ctx3;
            
            if (addResult.added) {
              await emit('fixing', 'complete', { message: `Added ${statusResult.parsedError.module}` });
              await emit('pushing', 'in_progress');
              // Emit pushing status is implicit in add_dependency, so mark complete
              await emit('pushing', 'complete');
              
              // Re-trigger deployment
              await emit('deploying', 'in_progress', { attempt: attempt + 1, maxAttempts: max_retries });
              const { result: redeployResult, context: ctx4 } = await executeTool(
                'vercel_trigger_deployment',
                { project_id: context.lastVercelProjectId, branch: branchToUse },
                context
              );
              context = ctx4;
              
              if (redeployResult.deploymentId) {
                // Continue monitoring new deployment
                continue;
              }
            } else {
              await emit('fixing', 'error', { error: 'Failed to add dependency' });
            }
          }
          
          // For other errors, we need AI intervention
          await emit('complete', 'error', { error: statusResult.parsedError.message });
          return {
            result: {
              success: false,
              status: 'ERROR',
              error: statusResult.parsedError,
              buildLogs: statusResult.buildLogs,
              deploymentId,
              attempts: attempt,
              needsManualFix: true,
              suggestion: statusResult.parsedError.actionable 
                ? `Fix the ${statusResult.parsedError.type} error and retry deployment.`
                : 'Review the build logs and fix the underlying issue.'
            },
            context
          };
        }
        
        // Still building, continue waiting
        if (lastStatus === 'BUILDING' || lastStatus === 'QUEUED' || lastStatus === 'INITIALIZING') {
          continue;
        }
      }
      
      await emit('complete', 'error', { error: `Deployment did not complete after ${max_retries} attempts` });
      return {
        result: {
          success: false,
          status: lastStatus,
          deploymentId,
          attempts: attempt,
          message: `Deployment did not complete after ${max_retries} attempts.`
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
    
    let existingSession = null;
    let vercelProjectIdFromDb: string | null = null;
    
    if (supabaseUrl && supabaseKey && projectId && userId) {
      existingSession = await loadAgentSession(supabaseUrl, supabaseKey, projectId, userId);
      console.log('Loaded existing session:', existingSession ? 'found' : 'none');
      
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
    
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    }
    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectIdGoogle = serviceAccount.project_id;
    
    const accessToken = await getGoogleAccessToken(serviceAccount);
    
    let toolContext: ToolContext = { 
      stagedFiles: existingSession?.staged_files || {},
      projectId,
      conversationId,
      userId,
      supabaseUrl,
      supabaseKey
    };
    
    if (existingSession?.github_owner && existingSession?.github_repo) {
      toolContext.currentRepo = {
        owner: existingSession.github_owner,
        repo: existingSession.github_repo,
        branch: existingSession.current_branch || 'main'
      };
    }
    
    if (vercelProjectIdFromDb) {
      toolContext.lastVercelProjectId = vercelProjectIdFromDb;
    } else if (existingSession?.vercel_project_id) {
      toolContext.lastVercelProjectId = existingSession.vercel_project_id;
    }
    
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

    const stagedFilesCount = Object.keys(toolContext.stagedFiles).length;
    const stagedFilesList = Object.keys(toolContext.stagedFiles);

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
- analyze_dependencies - Check if imports have matching dependencies

BLOCKED actions (do NOT attempt these - tell user to switch to Execute mode):
- file_write, file_delete
- git_add_commit_push
- vercel_create_project, vercel_trigger_deployment
- github_create_pull_request
- add_dependency
- autonomous_deploy_and_verify

START by cloning the repo if not already done, then analyze code and discuss plans.
If the user asks to make changes, explain what you WOULD do and ask them to switch to Execute mode.`
      : `## EXECUTION MODE - FULL AUTONOMOUS ACCESS

You are a fully autonomous AI coding agent with complete tool access.

### CRITICAL: AUTONOMOUS WORKFLOW

**BEFORE writing any file with new imports:**
1. Use \`analyze_dependencies\` to check if packages are installed
2. If missing packages found, use \`add_dependency\` FIRST
3. Then use \`file_write\` (which pushes directly to GitHub)

**AFTER making changes:**
1. Use \`autonomous_deploy_and_verify\` to deploy and auto-fix errors
2. This tool will:
   - Deploy to Vercel
   - Monitor build status
   - If build fails: read logs, identify error, auto-fix, redeploy
   - Repeat until success or max retries
   - Take screenshot to verify success

**file_write BEHAVIOR:**
- Each file_write IMMEDIATELY pushes to GitHub (atomic commit)
- Vercel auto-deploys from GitHub
- No need for separate git_add_commit_push for single files

**COMMON WORKFLOW:**
\`\`\`
1. Clone repo (if needed)
2. Read package.json and relevant files
3. analyze_dependencies on any file with new imports
4. add_dependency for any missing packages
5. file_write to make code changes (auto-pushes)
6. autonomous_deploy_and_verify to deploy and verify
\`\`\`

**IF BUILD FAILS:**
- get_build_logs to see the error
- The logs will include parsedError with actionable insights
- Fix the issue (missing module? add_dependency. Syntax? fix the file)
- file_write the fix (auto-pushes)
- Redeploy

**Current staged files: ${stagedFilesCount}**
${stagedFilesCount > 0 
  ? `Files tracked locally:\n${stagedFilesList.map(f => `  - ${f}`).join('\n')}`
  : '(none - file_write pushes immediately now)'}`;

    const systemPrompt = `You are an AUTONOMOUS AI coding agent for Product Compass. You translate natural language requests into precise code changes, handle dependencies, deploy previews, and auto-fix build errors.

${modeInstructions}

## CRITICAL BRANCH RULES
- Your working branch is: ${toolContext.currentRepo?.branch || '(will be auto-created when you clone)'}
- **NEVER ask the user which branch to use** - it is ALREADY SET automatically
- **NEVER ask the user to create a branch** - branches are AUTOMATIC
- When you clone a repository, your personal user branch is created automatically
- You MUST NOT push to main - only to your auto-assigned user branch

## AUTONOMOUS BEHAVIORS

1. **Dependency Management**: ALWAYS check dependencies before writing files with new imports. Use analyze_dependencies → add_dependency → file_write.

2. **Build Error Recovery**: When deployments fail:
   - Fetch build logs with get_build_logs
   - Parse the error (missing module, TypeScript error, syntax error)
   - Auto-fix by either adding dependencies or fixing code
   - Redeploy and verify

3. **Verification**: After successful deployment, use capture_screenshot to verify the UI looks correct.

4. **Minimal Changes**: Only modify what's necessary. Don't refactor unrelated code.

## Available Tools

### File Operations (with GitHub push)
- file_read - Read a file
- file_write - Write file AND push to GitHub immediately
- file_delete - Delete a file
- list_directory - List directory contents
- search_code - Search for code patterns

### Dependency Management
- analyze_dependencies - Check if imports are in package.json
- add_dependency - Add a package to package.json and push

### Deployment
- vercel_trigger_deployment - Deploy to Vercel
- vercel_get_deployment_status - Check deployment status
- get_build_logs - Get detailed build logs with error parsing
- autonomous_deploy_and_verify - Full auto-deploy with error recovery
- capture_screenshot - Screenshot deployed site

### Git (for batch operations)
- git_add_commit_push - Batch commit multiple staged files
- github_create_pull_request - Create PR to merge to main

## Current Context
- GitHub Repository: ${toolContext.currentRepo ? `https://github.com/${toolContext.currentRepo.owner}/${toolContext.currentRepo.repo}` : (githubRepo || 'Not connected')}
- Current Branch: ${toolContext.currentRepo?.branch || '(auto-created on clone)'}
- Vercel Project ID: ${toolContext.lastVercelProjectId || 'Not configured'}
- Project ID: ${projectId}

## DEPLOYMENT QUICK REFERENCE
**Vercel Project ID: ${toolContext.lastVercelProjectId || 'NOT CONFIGURED'}**
**Branch: ${toolContext.currentRepo?.branch || 'NOT SET'}**

When user says "deploy":
→ Call vercel_trigger_deployment() with no arguments
→ Or use autonomous_deploy_and_verify() for full auto-fix loop
${visualContext ? `
## Visual Element Context (User selected this element)
- Selector: ${visualContext.selector}
- Text Content: ${visualContext.textContent || 'N/A'}
- Current Styles: ${JSON.stringify(visualContext.computedStyles || {})}
` : ''}`;

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

    // Deploy shortcut
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
    
    const forceDeployPatterns = [
      /^deploy\s+without\s+(pending\s+)?changes$/i,
      /^force\s+deploy$/i,
      /^deploy\s+anyway$/i
    ];
    const isForceDeployIntent = forceDeployPatterns.some(p => p.test(message.trim()));
    
    if ((isDeployIntent || isForceDeployIntent) && mode === 'execution') {
      console.log('[Deploy Shortcut] TRIGGERED - bypassing LLM');
      
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
      
      const { result: deployResult, context: updatedContext } = await executeTool(
        'vercel_trigger_deployment',
        { project_id: toolContext.lastVercelProjectId, branch: deployBranch },
        toolContext
      );
      
      console.log('[Deploy Shortcut] Deployment result:', deployResult);
      
      if (supabaseUrl && supabaseKey && projectId && userId) {
        await saveAgentSession(supabaseUrl, supabaseKey, projectId, userId, updatedContext, mode);
      }
      
      let responseText: string;
      if (deployResult.error) {
        responseText = `Deployment failed: ${deployResult.error}`;
      } else {
        responseText = `🚀 **Deployment triggered successfully!**\n\n` +
          `- **Branch:** ${deployBranch}\n` +
          `- **Deployment ID:** ${deployResult.deploymentId || 'pending'}\n` +
          `- **Status:** ${deployResult.status || 'queued'}\n` +
          (deployResult.url ? `- **Preview URL:** https://${deployResult.url}\n` : '') +
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

    const messages: any[] = [
      ...history.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      { role: 'user', parts: [{ text: userMessage }] }
    ];

    const activeTools = mode === 'chat'
      ? toolDefinitions.filter(t => chatModeTools.includes(t.name))
      : toolDefinitions;
    
    console.log(`Mode: ${mode}, Active tools: ${activeTools.length}`);

    let finalResponse = '';
    let iterations = 0;
    const maxIterations = 20; // Increased for autonomous loops

    while (iterations < maxIterations) {
      iterations++;
      console.log(`Agent iteration ${iterations}`);
      
      const vertexUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectIdGoogle}/locations/us-central1/publishers/google/models/gemini-2.0-flash:generateContent`;
      
      const vertexResponse = await fetch(vertexUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
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
          
          toolResults.push({
            functionResponse: {
              name,
              response: result
            }
          });
        }
      }

      messages.push({ role: 'model', parts });

      if (hasToolCalls && toolResults.length > 0) {
        messages.push({ role: 'user', parts: toolResults });
      } else {
        break;
      }
    }

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
