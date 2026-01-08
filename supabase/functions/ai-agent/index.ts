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
        branch: { type: 'STRING', description: 'Branch to push to' }
      },
      required: ['commit_message', 'branch']
    }
  },
  {
    name: 'vercel_trigger_deployment',
    description: 'Trigger a new Vercel deployment for a project',
    parameters: {
      type: 'OBJECT',
      properties: {
        project_id: { type: 'STRING', description: 'Vercel project ID' },
        branch: { type: 'STRING', description: 'Git branch to deploy' }
      },
      required: ['project_id', 'branch']
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
      context.currentRepo = { owner, repo, branch };
      
      // Get file tree
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
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
          branch,
          fileCount: files.length,
          files: files.slice(0, 50) // Return first 50 files for context
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
      if (!context.stagedFiles[file_path]) {
        context.stagedFiles[file_path] = { original: '', modified: content };
      } else {
        context.stagedFiles[file_path].modified = content;
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

    case 'generate_diff': {
      const { file_paths } = args;
      const diffs: string[] = [];
      let additions = 0;
      let deletions = 0;
      
      for (const path of file_paths) {
        const file = context.stagedFiles[path];
        if (file && file.original !== file.modified) {
          const diff = generateUnifiedDiff(path, file.original, file.modified);
          diffs.push(diff);
          
          // Count changes
          const diffLines = diff.split('\n');
          additions += diffLines.filter(l => l.startsWith('+')).length;
          deletions += diffLines.filter(l => l.startsWith('-')).length;
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
      const { commit_message, branch } = args;
      
      if (!context.currentRepo) {
        return { result: { error: 'No repository cloned. Use github_clone_repo first.' }, context };
      }
      
      const { owner, repo } = context.currentRepo;
      const baseBranch = context.currentRepo.branch;
      
      // Get the base branch's latest commit
      const refResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`,
        { headers: githubHeaders }
      );
      const refData = await refResponse.json();
      const baseSha = refData.object?.sha;
      
      if (!baseSha) {
        return { result: { error: 'Could not get base commit SHA' }, context };
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
        if (file.original !== file.modified) {
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
        return { result: { error: 'No changes to commit' }, context };
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

    case 'vercel_trigger_deployment': {
      const { project_id, branch } = args;
      
      const response = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: project_id,
          project: project_id,
          gitSource: { type: 'github', ref: branch }
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        return { result: { error: data.error.message }, context };
      }
      
      context.lastDeploymentId = data.id;
      
      return {
        result: { 
          deploymentId: data.id, 
          url: data.url,
          inspectorUrl: data.inspectorUrl,
          status: data.status 
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
    const { message, conversationId, projectId, history = [], githubRepo } = await req.json();
    
    console.log('AI Agent received request:', { message, conversationId, projectId, githubRepo });
    
    // Parse service account
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    }
    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectIdGoogle = serviceAccount.project_id;
    
    // Get access token
    const accessToken = await getGoogleAccessToken(serviceAccount);
    
    // Build comprehensive system prompt per specification
    const systemPrompt = `You are an autonomous AI coding agent for Product Compass, a collaborative product development platform. Your role is to translate natural language requests into precise code changes, deploy previews, and facilitate team approvals.

## Core Behaviors

1. **Minimal Changes Only**: When modifying code, make the smallest possible changes that accomplish the request. Never refactor unrelated code or add unrequested features.

2. **Context Awareness**: Before editing, always read relevant files to understand the existing patterns, imports, and coding style. Match the project's conventions.

3. **React/TypeScript Focus**: The codebase uses React, TypeScript, and Tailwind CSS. Generate code that follows these patterns and includes proper type annotations.

4. **Error Recovery**: If a deployment fails, analyze the Vercel build logs, identify the issue, and attempt a fix automatically (up to 3 retries). Report to the user only after exhausting retries.

5. **Clear Communication**: Always explain what you're doing in concise, non-technical language. Show diffs in a readable format before committing.

## Workflow

For each user request:
1. Acknowledge the request and explain your plan
2. Clone/pull the latest code from the specified branch
3. Read relevant files to understand context
4. Generate minimal code changes
5. Show the diff to the user for feedback
6. If approved, commit and push changes
7. Trigger Vercel deployment and poll for status
8. Report preview URL when ready
9. On approval, create GitHub Pull Request

## Tool Usage

You have access to 8 tools. Use them in the appropriate sequence:
- Start with github_clone_repo for fresh context
- Use file_read before file_write to understand existing code
- Always generate_diff before committing to show the user
- After pushing, immediately vercel_trigger_deployment
- Poll vercel_get_deployment_status every 10 seconds until complete
- Only call github_create_pull_request when user explicitly approves

## Safety Rules

- Never delete files unless explicitly requested
- Never expose API keys or secrets in code
- Never modify .env files or configuration that could break the build
- If a request seems destructive, ask for confirmation first

## Current Context
- GitHub Repository: ${githubRepo || 'Not connected'}
- Project ID: ${projectId}
- Conversation ID: ${conversationId}`;

    const messages: any[] = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'I understand. I am ready to help you with code changes following the specified workflow and safety rules.' }] },
      ...history.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ];

    // Context for tool execution
    let toolContext: ToolContext = { stagedFiles: {} };
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
          contents: messages,
          tools: [{ functionDeclarations: toolDefinitions }],
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

    console.log('Agent completed with final response:', finalResponse.substring(0, 200));

    return new Response(
      JSON.stringify({ 
        response: finalResponse,
        iterations,
        success: true
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
