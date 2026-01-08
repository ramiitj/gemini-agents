-- Table 1: code_changes - stores individual file changes from agent edits
CREATE TABLE public.code_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  conversation_id UUID,
  message_id UUID,
  agent_run_id UUID,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'modified',
  original_content TEXT,
  modified_content TEXT,
  diff_content TEXT,
  additions INT DEFAULT 0,
  deletions INT DEFAULT 0,
  commit_sha TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID
);

ALTER TABLE public.code_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view code changes"
  ON public.code_changes FOR SELECT
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.organization_id IN (SELECT get_user_org_ids(auth.uid()))));

CREATE POLICY "Project editors can create code changes"
  ON public.code_changes FOR INSERT
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE has_role(auth.uid(), p.organization_id, 'owner'::app_role) OR has_role(auth.uid(), p.organization_id, 'admin'::app_role) OR has_role(auth.uid(), p.organization_id, 'editor'::app_role)));

CREATE POLICY "Project editors can update code changes"
  ON public.code_changes FOR UPDATE
  USING (project_id IN (SELECT p.id FROM projects p WHERE has_role(auth.uid(), p.organization_id, 'owner'::app_role) OR has_role(auth.uid(), p.organization_id, 'admin'::app_role) OR has_role(auth.uid(), p.organization_id, 'editor'::app_role)));

-- Table 2: change_requests - groups changes into reviewable units
CREATE TABLE public.change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  conversation_id UUID,
  deployment_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  commit_sha TEXT,
  github_pr_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view change requests"
  ON public.change_requests FOR SELECT
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.organization_id IN (SELECT get_user_org_ids(auth.uid()))));

CREATE POLICY "Project editors can create change requests"
  ON public.change_requests FOR INSERT
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE has_role(auth.uid(), p.organization_id, 'owner'::app_role) OR has_role(auth.uid(), p.organization_id, 'admin'::app_role) OR has_role(auth.uid(), p.organization_id, 'editor'::app_role)));

CREATE POLICY "Project editors can update change requests"
  ON public.change_requests FOR UPDATE
  USING (project_id IN (SELECT p.id FROM projects p WHERE has_role(auth.uid(), p.organization_id, 'owner'::app_role) OR has_role(auth.uid(), p.organization_id, 'admin'::app_role) OR has_role(auth.uid(), p.organization_id, 'editor'::app_role)));

-- Table 3: team_comments - threaded discussions on change requests
CREATE TABLE public.team_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id UUID NOT NULL REFERENCES public.change_requests(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.team_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  quoted_text TEXT,
  file_path TEXT,
  line_number INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.team_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view comments"
  ON public.team_comments FOR SELECT
  USING (change_request_id IN (SELECT cr.id FROM change_requests cr JOIN projects p ON p.id = cr.project_id WHERE p.organization_id IN (SELECT get_user_org_ids(auth.uid()))));

CREATE POLICY "Project members can create comments"
  ON public.team_comments FOR INSERT
  WITH CHECK (change_request_id IN (SELECT cr.id FROM change_requests cr JOIN projects p ON p.id = cr.project_id WHERE p.organization_id IN (SELECT get_user_org_ids(auth.uid()))));

CREATE POLICY "Users can update own comments"
  ON public.team_comments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON public.team_comments FOR DELETE
  USING (user_id = auth.uid());

-- Enable realtime for all new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.code_changes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.change_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_comments;

-- Add indexes for performance
CREATE INDEX idx_code_changes_project ON public.code_changes(project_id);
CREATE INDEX idx_code_changes_conversation ON public.code_changes(conversation_id);
CREATE INDEX idx_change_requests_project ON public.change_requests(project_id);
CREATE INDEX idx_team_comments_change_request ON public.team_comments(change_request_id);
CREATE INDEX idx_team_comments_parent ON public.team_comments(parent_id);

-- Add trigger for updated_at on change_requests
CREATE TRIGGER update_change_requests_updated_at
  BEFORE UPDATE ON public.change_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on team_comments
CREATE TRIGGER update_team_comments_updated_at
  BEFORE UPDATE ON public.team_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();