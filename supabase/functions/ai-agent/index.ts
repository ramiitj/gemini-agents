import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tool definitions for Vertex AI function calling
const toolDefinitions = [
  {
    name: 'github_list_files',
    description: 'List all files in a GitHub repository to understand its structure',
    parameters: {
      type: 'OBJECT',
      properties: {
        owner: { type: 'STRING', description: 'Repository owner/organization' },
        repo: { type: 'STRING', description: 'Repository name' },
        branch: { type: 'STRING', description: 'Branch name (default: main)' }
      },
      required: ['owner', 'repo']
    }
  },
  {
    name: 'github_read_file',
    description: 'Read the content of a specific file from a GitHub repository',
    parameters: {
      type: 'OBJECT',
      properties: {
        owner: { type: 'STRING', description: 'Repository owner/organization' },
        repo: { type: 'STRING', description: 'Repository name' },
        path: { type: 'STRING', description: 'File path in the repository' },
        branch: { type: 'STRING', description: 'Branch name (default: main)' }
      },
      required: ['owner', 'repo', 'path']
    }
  },
  {
    name: 'github_write_file',
    description: 'Write or update a file in the repository (stages the change)',
    parameters: {
      type: 'OBJECT',
      properties: {
        path: { type: 'STRING', description: 'File path to write' },
        content: { type: 'STRING', description: 'New file content' },
        message: { type: 'STRING', description: 'Description of the change' }
      },
      required: ['path', 'content', 'message']
    }
  },
  {
    name: 'git_commit_push',
    description: 'Commit all staged changes and push to a new branch',
    parameters: {
      type: 'OBJECT',
      properties: {
        owner: { type: 'STRING', description: 'Repository owner' },
        repo: { type: 'STRING', description: 'Repository name' },
        branch: { type: 'STRING', description: 'New branch name to create' },
        message: { type: 'STRING', description: 'Commit message' }
      },
      required: ['owner', 'repo', 'branch', 'message']
    }
  },
  {
    name: 'vercel_deploy',
    description: 'Trigger a Vercel deployment for a project',
    parameters: {
      type: 'OBJECT',
      properties: {
        projectId: { type: 'STRING', description: 'Vercel project ID' },
        ref: { type: 'STRING', description: 'Git ref (branch) to deploy' }
      },
      required: ['projectId', 'ref']
    }
  },
  {
    name: 'vercel_get_status',
    description: 'Check the status of a Vercel deployment',
    parameters: {
      type: 'OBJECT',
      properties: {
        deploymentId: { type: 'STRING', description: 'Vercel deployment ID' }
      },
      required: ['deploymentId']
    }
  },
  {
    name: 'github_create_pr',
    description: 'Create a pull request from a feature branch to main',
    parameters: {
      type: 'OBJECT',
      properties: {
        owner: { type: 'STRING', description: 'Repository owner' },
        repo: { type: 'STRING', description: 'Repository name' },
        head: { type: 'STRING', description: 'Feature branch name' },
        base: { type: 'STRING', description: 'Target branch (default: main)' },
        title: { type: 'STRING', description: 'Pull request title' },
        body: { type: 'STRING', description: 'Pull request description' }
      },
      required: ['owner', 'repo', 'head', 'title']
    }
  }
];

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

  // Import the private key
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

  // Create JWT
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

  // Exchange JWT for access token
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

// Execute a tool call by invoking the appropriate edge function
async function executeTool(
  supabaseUrl: string,
  supabaseKey: string,
  toolName: string,
  args: Record<string, any>,
  context: { stagedFiles: Record<string, string> }
): Promise<{ result: any; context: typeof context }> {
  console.log(`Executing tool: ${toolName}`, args);
  
  const githubToken = Deno.env.get('GITHUB_PAT');
  const vercelToken = Deno.env.get('VERCEL_TOKEN');
  
  switch (toolName) {
    case 'github_list_files': {
      const { owner, repo, branch = 'main' } = args;
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
      const data = await response.json();
      return {
        result: data.tree?.map((f: any) => ({ path: f.path, type: f.type })) || [],
        context
      };
    }
    
    case 'github_read_file': {
      const { owner, repo, path, branch = 'main' } = args;
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
      const data = await response.json();
      const content = data.content ? atob(data.content.replace(/\n/g, '')) : '';
      return { result: { path, content }, context };
    }
    
    case 'github_write_file': {
      const { path, content, message } = args;
      context.stagedFiles[path] = content;
      return {
        result: { staged: true, path, message },
        context
      };
    }
    
    case 'git_commit_push': {
      const { owner, repo, branch, message } = args;
      
      // Get the default branch's latest commit
      const refResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/main`,
        {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'AI-Agent'
          }
        }
      );
      const refData = await refResponse.json();
      const baseSha = refData.object?.sha;
      
      if (!baseSha) {
        return { result: { error: 'Could not get base commit SHA' }, context };
      }
      
      // Get the base tree
      const commitResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/commits/${baseSha}`,
        {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'AI-Agent'
          }
        }
      );
      const commitData = await commitResponse.json();
      const baseTreeSha = commitData.tree?.sha;
      
      // Create blobs for each staged file
      const treeItems = [];
      for (const [path, content] of Object.entries(context.stagedFiles)) {
        const blobResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'AI-Agent',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content, encoding: 'utf-8' })
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
      
      // Create new tree
      const treeResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'AI-Agent',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems })
        }
      );
      const treeData = await treeResponse.json();
      
      // Create commit
      const newCommitResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/commits`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'AI-Agent',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message,
            tree: treeData.sha,
            parents: [baseSha]
          })
        }
      );
      const newCommitData = await newCommitResponse.json();
      
      // Create new branch
      const createBranchResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/refs`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'AI-Agent',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ref: `refs/heads/${branch}`,
            sha: newCommitData.sha
          })
        }
      );
      
      const branchResult = await createBranchResponse.json();
      context.stagedFiles = {}; // Clear staged files
      
      return {
        result: { branch, commitSha: newCommitData.sha, success: true },
        context
      };
    }
    
    case 'vercel_deploy': {
      const { projectId, ref } = args;
      const response = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: projectId,
          project: projectId,
          gitSource: { type: 'github', ref }
        })
      });
      const data = await response.json();
      return {
        result: { deploymentId: data.id, url: data.url, status: data.status },
        context
      };
    }
    
    case 'vercel_get_status': {
      const { deploymentId } = args;
      const response = await fetch(
        `https://api.vercel.com/v13/deployments/${deploymentId}`,
        {
          headers: { 'Authorization': `Bearer ${vercelToken}` }
        }
      );
      const data = await response.json();
      return {
        result: { status: data.status, url: data.url, ready: data.ready },
        context
      };
    }
    
    case 'github_create_pr': {
      const { owner, repo, head, base = 'main', title, body = '' } = args;
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
          body: JSON.stringify({ title, body, head, base })
        }
      );
      const data = await response.json();
      return {
        result: { prNumber: data.number, prUrl: data.html_url },
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
    
    // Build conversation context
    const systemPrompt = `You are an AI coding assistant that helps developers modify their codebase.
You have access to tools to read files, write files, commit changes, deploy, and create pull requests.

Current project context:
- GitHub Repository: ${githubRepo || 'Not connected'}
- Project ID: ${projectId}

When the user asks you to make changes:
1. First list/read relevant files to understand the codebase
2. Write the necessary changes using github_write_file
3. Commit and push changes to a new branch
4. Trigger a deployment to preview
5. Create a pull request

Always explain what you're doing at each step.`;

    const messages = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...history.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ];

    // Context for tool execution
    let toolContext = { stagedFiles: {} as Record<string, string> };
    let finalResponse = '';
    let iterations = 0;
    const maxIterations = 10;

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
          toolConfig: { functionCallingConfig: { mode: 'AUTO' } }
        })
      });

      const vertexData = await vertexResponse.json();
      console.log('Vertex AI response:', JSON.stringify(vertexData).substring(0, 500));
      
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
          
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
          const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
          
          const { result, context } = await executeTool(
            supabaseUrl,
            supabaseKey,
            name,
            args || {},
            toolContext
          );
          
          toolContext = context;
          toolResults.push({
            functionResponse: {
              name,
              response: result
            }
          });
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
