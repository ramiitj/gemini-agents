-- Critical missing tables for Product Compass workflow
-- This migration adds code_changes, invitations, and change_requests tables

-- 1. CODE_CHANGES TABLE
-- Stores AI-generated code modifications before approval
CREATE TABLE public.code_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  agent_run_id TEXT,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('added', 'modified', 'deleted')),
  original_content TEXT,
  modified_content TEXT,
  diff_content TEXT,
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  commit_sha TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for code_changes
ALTER TABLE public.code_changes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for code_changes
CREATE POLICY "Project members can view code changes"
  ON public.code_changes FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      WHERE p.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    )
  );

CREATE POLICY "Editors can create code changes"
  ON public.code_changes FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
      WHERE public.has_role(auth.uid(), p.organization_id, 'owner')
         OR public.has_role(auth.uid(), p.organization_id, 'admin')
         OR public.has_role(auth.uid(), p.organization_id, 'editor')
    )
  );

CREATE POLICY "Members can approve code changes"
  ON public.code_changes FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      WHERE p.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    )
  );

-- Enable realtime for code_changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.code_changes;

-- Set replica identity for realtime
ALTER TABLE public.code_changes REPLICA IDENTITY FULL;

-- Indexes for performance
CREATE INDEX idx_code_changes_project_id ON public.code_changes(project_id);
CREATE INDEX idx_code_changes_conversation_id ON public.code_changes(conversation_id);
CREATE INDEX idx_code_changes_approved_at ON public.code_changes(approved_at) WHERE approved_at IS NULL;
CREATE INDEX idx_code_changes_created_at ON public.code_changes(created_at DESC);

-- 2. INVITATIONS TABLE
-- Handles team member invitations with secure tokens
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'viewer',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invitations
CREATE POLICY "Org members can view invitations"
  ON public.invitations FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org admins can create invitations"
  ON public.invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), organization_id, 'owner') OR
    public.has_role(auth.uid(), organization_id, 'admin')
  );

CREATE POLICY "Org admins can update invitations"
  ON public.invitations FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), organization_id, 'owner') OR
    public.has_role(auth.uid(), organization_id, 'admin')
  );

-- Indexes for invitations
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_invitations_organization_id ON public.invitations(organization_id);
CREATE INDEX idx_invitations_status ON public.invitations(status) WHERE status = 'pending';

-- 3. CHANGE_REQUESTS TABLE
-- Tracks approval workflows for team collaboration
CREATE TABLE public.change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  deployment_id UUID REFERENCES public.deployments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for change_requests
ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for change_requests
CREATE POLICY "Project members can view change requests"
  ON public.change_requests FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      WHERE p.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    )
  );

CREATE POLICY "Editors can create change requests"
  ON public.change_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
      WHERE public.has_role(auth.uid(), p.organization_id, 'owner')
         OR public.has_role(auth.uid(), p.organization_id, 'admin')
         OR public.has_role(auth.uid(), p.organization_id, 'editor')
    )
  );

CREATE POLICY "Project members can update change requests"
  ON public.change_requests FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      WHERE p.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    )
  );

-- Indexes for change_requests
CREATE INDEX idx_change_requests_project_id ON public.change_requests(project_id);
CREATE INDEX idx_change_requests_status ON public.change_requests(status);
CREATE INDEX idx_change_requests_created_at ON public.change_requests(created_at DESC);

-- Trigger for updated_at on change_requests
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_change_requests_updated_at
  BEFORE UPDATE ON public.change_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for change_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.change_requests;
ALTER TABLE public.change_requests REPLICA IDENTITY FULL;

-- Add comment documentation
COMMENT ON TABLE public.code_changes IS 'Stores AI-generated code modifications before team approval';
COMMENT ON TABLE public.invitations IS 'Manages team member invitation tokens and workflow';
COMMENT ON TABLE public.change_requests IS 'Tracks approval workflows for code changes';
