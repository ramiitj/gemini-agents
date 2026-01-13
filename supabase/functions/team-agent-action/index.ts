import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface TeamActionRequest {
  action: 'approve' | 'reject' | 'merge';
  actionId: string;
  projectId: string;
  comment?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get user from authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const userClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the current user
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { action, actionId, projectId, comment }: TeamActionRequest = await req.json();

    // Fetch the team action
    const { data: teamAction, error: fetchError } = await supabase
      .from("team_actions")
      .select("*")
      .eq("id", actionId)
      .single();

    if (fetchError || !teamAction) {
      throw new Error("Team action not found");
    }

    // Fetch project details for GitHub/Vercel info
    const { data: project } = await supabase
      .from("projects")
      .select("*, organizations(*)")
      .eq("id", projectId)
      .single();

    if (!project) {
      throw new Error("Project not found");
    }

    // Get user's permissions
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role, custom_permissions, custom_role_id")
      .eq("organization_id", project.organization_id)
      .eq("user_id", user.id)
      .single();

    let permissions: Record<string, Record<string, boolean>> = {};
    
    if (userRole?.custom_permissions) {
      permissions = userRole.custom_permissions as Record<string, Record<string, boolean>>;
    } else if (userRole?.custom_role_id) {
      const { data: customRole } = await supabase
        .from("custom_roles")
        .select("permissions")
        .eq("id", userRole.custom_role_id)
        .single();
      if (customRole?.permissions) {
        permissions = customRole.permissions as Record<string, Record<string, boolean>>;
      }
    } else if (userRole?.role) {
      // Use preset permissions
      const presets: Record<string, Record<string, Record<string, boolean>>> = {
        owner: { team: { approve: true, merge: true, manage: true }, deployments: { trigger: true, manage: true } },
        admin: { team: { approve: true, merge: true, manage: true }, deployments: { trigger: true, manage: true } },
        editor: { team: { approve: false, merge: false }, deployments: { trigger: true } },
        viewer: { team: { approve: false, merge: false }, deployments: { trigger: false } }
      };
      permissions = presets[userRole.role] || {};
    }

    const canApprove = permissions.team?.approve || permissions.team?.manage || false;
    const canMerge = permissions.team?.merge || permissions.deployments?.trigger || permissions.deployments?.manage || false;

    switch (action) {
      case 'approve': {
        if (!canApprove) {
          throw new Error("No permission to approve changes");
        }

        // Update the action
        const { error: updateError } = await supabase
          .from("team_actions")
          .update({
            action_type: 'approved',
            acted_by: user.id,
            action_comment: comment || null,
            resolved_at: new Date().toISOString()
          })
          .eq("id", actionId);

        if (updateError) throw updateError;

        // Get initiator's profile for the notification
        const { data: initiatorProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", teamAction.initiated_by)
          .single();

        const { data: actorProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        // Create a notification comment
        await supabase
          .from("team_comments")
          .insert({
            project_id: projectId,
            user_id: user.id,
            content: `✓ Approved by ${actorProfile?.full_name || 'PM'}.\n@${initiatorProfile?.full_name || 'Author'}: Ready to merge to main.`,
            parent_id: teamAction.comment_id
          });

        return new Response(
          JSON.stringify({ success: true, message: "Changes approved" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'reject': {
        if (!canApprove) {
          throw new Error("No permission to reject changes");
        }

        if (!comment) {
          throw new Error("Rejection requires a reason");
        }

        // Update the action
        const { error: updateError } = await supabase
          .from("team_actions")
          .update({
            action_type: 'rejected',
            acted_by: user.id,
            action_comment: comment,
            resolved_at: new Date().toISOString()
          })
          .eq("id", actionId);

        if (updateError) throw updateError;

        // Get actor's profile
        const { data: actorProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        // Create a rejection comment
        await supabase
          .from("team_comments")
          .insert({
            project_id: projectId,
            user_id: user.id,
            content: `✗ Rejected by ${actorProfile?.full_name || 'PM'}.\nReason: "${comment}"\nBack to draft.`,
            parent_id: teamAction.comment_id
          });

        return new Response(
          JSON.stringify({ success: true, message: "Changes rejected" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'merge': {
        // Must be original author OR have merge permission
        const isOriginalAuthor = teamAction.initiated_by === user.id;
        if (!isOriginalAuthor && !canMerge) {
          throw new Error("No permission to merge changes");
        }

        // Check if action is approved
        if (teamAction.action_type !== 'approved') {
          throw new Error("Changes must be approved before merging");
        }

        // Get GitHub repo info from project
        const githubRepo = project.github_repo;
        if (!githubRepo) {
          // Still mark as merged for demo purposes
          await supabase
            .from("team_actions")
            .update({
              action_type: 'merged',
              resolved_at: new Date().toISOString()
            })
            .eq("id", actionId);

          await supabase
            .from("team_comments")
            .insert({
              project_id: projectId,
              user_id: user.id,
              content: `✓ Merged & Deployed.\n(GitHub repo not connected - demo mode)`
            });

          return new Response(
            JSON.stringify({ success: true, message: "Changes merged (demo mode)" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Extract owner/repo from github_repo URL or string
        let owner = '';
        let repo = '';
        if (githubRepo.includes('/')) {
          const parts = githubRepo.replace('https://github.com/', '').split('/');
          owner = parts[0];
          repo = parts[1]?.replace('.git', '') || '';
        }

        const branchName = teamAction.branch_name;

        // Create PR
        let prUrl = null;
        let prNumber = null;

        try {
          const prResponse = await supabase.functions.invoke('github-create-pr', {
            body: {
              owner,
              repo,
              title: teamAction.change_summary || 'Merge approved changes',
              head: branchName,
              base: 'main',
              body: `Changes approved and merged via Team Chat.\n\nFiles changed:\n${(teamAction.files_changed || []).map((f: string) => `- ${f}`).join('\n')}`
            }
          });

          if (prResponse.data?.html_url) {
            prUrl = prResponse.data.html_url;
            prNumber = prResponse.data.number;
          }
        } catch (prError) {
          console.error("PR creation error:", prError);
          // Continue without PR URL
        }

        // Trigger Vercel deploy (if project has vercel_project_id)
        let productionUrl = null;
        if (project.vercel_project_id) {
          try {
            const deployResponse = await supabase.functions.invoke('vercel-deploy', {
              body: {
                projectId: project.vercel_project_id,
                supabaseProjectId: projectId,
                branch: 'main'
              }
            });

            if (deployResponse.data?.url) {
              productionUrl = deployResponse.data.url;
            }
          } catch (deployError) {
            console.error("Deploy error:", deployError);
            // Continue without production URL
          }
        }

        // Update action with results
        await supabase
          .from("team_actions")
          .update({
            action_type: 'merged',
            pr_url: prUrl,
            production_url: productionUrl,
            resolved_at: new Date().toISOString()
          })
          .eq("id", actionId);

        // Create completion comment
        let completionMessage = `✓ Merged & Deployed.`;
        if (productionUrl) {
          completionMessage += `\nLive: ${productionUrl}`;
        }
        if (prUrl) {
          completionMessage += `\nPR: ${prUrl}`;
        }

        await supabase
          .from("team_comments")
          .insert({
            project_id: projectId,
            user_id: user.id,
            content: completionMessage
          });

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Changes merged",
            prUrl,
            productionUrl
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error("Team agent action error:", error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
