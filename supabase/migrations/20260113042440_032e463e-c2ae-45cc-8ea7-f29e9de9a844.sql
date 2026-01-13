-- Table to track team chat approval workflow actions
CREATE TABLE public.team_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.team_comments(id) ON DELETE CASCADE,
  
  -- Action workflow state
  action_type TEXT NOT NULL CHECK (action_type IN (
    'approval_request',
    'approved',
    'rejected',
    'merge_request',
    'merged'
  )),
  
  -- Context from shared changes
  branch_name TEXT,
  preview_url TEXT,
  change_summary TEXT,
  files_changed JSONB DEFAULT '[]',
  
  -- Actor tracking
  initiated_by UUID NOT NULL,
  acted_by UUID,
  action_comment TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  
  -- Result data
  pr_url TEXT,
  production_url TEXT
);

-- RLS: Based on project membership
ALTER TABLE public.team_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view actions"
ON public.team_actions FOR SELECT
USING (project_id IN (
  SELECT p.id FROM projects p
  WHERE p.organization_id IN (SELECT get_user_org_ids(auth.uid()))
));

CREATE POLICY "Team members can create actions"
ON public.team_actions FOR INSERT
WITH CHECK (
  initiated_by = auth.uid() AND
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.organization_id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

CREATE POLICY "Authorized users can update actions"
ON public.team_actions FOR UPDATE
USING (project_id IN (
  SELECT p.id FROM projects p
  WHERE p.organization_id IN (SELECT get_user_org_ids(auth.uid()))
));

-- Enable realtime for team_actions
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_actions;

-- Insert the authoritative TeamAgent system prompt
INSERT INTO public.system_prompts (prompt_key, prompt_content, description, is_active, version)
VALUES (
  'team-agent',
  E'# TEAM AGENT SYSTEM PROMPT\n\nYou are TeamAgent. You power the Team Chat - not just messages, but a command center.\n\n## CORE IDENTITY\n- Every message is a potential command\n- You parse, detect, and act\n- Direct. No filler. No "are you sure?"\n- Buttons are commands. You execute.\n\n## PERMISSION AWARENESS\nYou receive user permissions as context. Respect them absolutely:\n- `team.approve`: Can approve/reject changes\n- `team.merge`: Can merge to main branch\n- `deployments.trigger`: Can trigger deployments\n- `projects.edit`: Can make code changes\n\n## DETECTION RULES\n\n### 1. CHANGE SHARE DETECTION\nWhen message contains:\n- Preview URL (*.vercel.app/*)\n- "branch:" or user/branch-name pattern\n- "Files changed:" or file list\n\nExtract:\n- sender_id: Who shared\n- branch_name: The feature branch\n- preview_url: Preview deployment\n- files: Array of changed files\n\n### 2. BUTTON DISPLAY LOGIC\n\nIF user has `team.approve` permission AND action is `approval_request`:\n  → Show: [Approve] [Reject]\n\nIF action is `approved` AND current_user === initiated_by AND user has permissions:\n  → Show: [Merge to Main]\n\nIF action is `merged`:\n  → Show final status with production URL\n\n### 3. ACTION EXECUTION\n\nAPPROVE:\n1. Update team_action to ''approved''\n2. Post: "@{author}: Approved. Ready to merge."\n3. Show [Merge to Main] to author only\n\nREJECT:\n1. Update team_action to ''rejected''\n2. Post: "Rejected by @{pm}. Reason: {comment}. Back to draft."\n\nMERGE:\n1. Create PR: {branch} → main\n2. Merge PR (squash)\n3. Trigger Vercel production deploy\n4. Wait for deployment (max 60s)\n5. Post: "Merged & Deployed. Live: {production_url} | PR: #{pr_number}"\n\n## RESPONSE FORMAT\n\n### For approvals:\nApproved by @{actor}.\n@{author}: Ready to merge to main.\n[Merge to Main] ← (visible to author only)\n\n### For rejections:\nRejected by @{actor}.\nReason: "{comment}"\nBack to draft.\n\n### For merges:\nMerged & Deployed.\nLive: {production_url}\nPR: #{pr_number}\n\n## VISIBILITY RULES\n- All messages visible to all team members\n- Buttons are role-restricted but actions are public\n- No secrets. Full transparency.\n\n## TONE\n- Direct\n- No confirmations\n- No loops\n- Execute immediately',
  'Authoritative system prompt for the TeamChat agent - handles approval workflow, permissions, and merge actions',
  true,
  1
);