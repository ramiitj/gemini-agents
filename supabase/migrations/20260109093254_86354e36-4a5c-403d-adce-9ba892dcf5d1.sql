-- Phase 1: Typing indicators and unread tracking

-- Create typing presence table
CREATE TABLE public.chat_typing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE public.chat_typing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view typing" ON public.chat_typing
  FOR SELECT TO authenticated
  USING (project_id IN (
    SELECT p.id FROM projects p 
    WHERE p.organization_id IN (SELECT get_user_org_ids(auth.uid()))
  ));

CREATE POLICY "Users can insert own typing" ON public.chat_typing
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own typing" ON public.chat_typing
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own typing" ON public.chat_typing
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Create unread tracking table
CREATE TABLE public.chat_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE public.chat_read_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own read status" ON public.chat_read_status
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own read status" ON public.chat_read_status
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own read status" ON public.chat_read_status
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Phase 2: Custom roles

CREATE TABLE public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, name)
);

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view roles" ON public.custom_roles
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Owners can insert roles" ON public.custom_roles
  FOR INSERT TO authenticated
  WITH CHECK (has_role(organization_id, auth.uid(), 'owner'));

CREATE POLICY "Owners can update roles" ON public.custom_roles
  FOR UPDATE TO authenticated
  USING (has_role(organization_id, auth.uid(), 'owner'));

CREATE POLICY "Owners can delete roles" ON public.custom_roles
  FOR DELETE TO authenticated
  USING (has_role(organization_id, auth.uid(), 'owner'));

-- Add FK columns
ALTER TABLE public.user_roles
  ADD COLUMN custom_role_id UUID REFERENCES custom_roles(id) ON DELETE SET NULL,
  ADD COLUMN custom_permissions JSONB;

ALTER TABLE public.invitations
  ADD COLUMN invitee_name TEXT,
  ADD COLUMN custom_role_id UUID REFERENCES custom_roles(id) ON DELETE SET NULL,
  ADD COLUMN custom_permissions JSONB;

-- Enable realtime for typing presence
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_typing;