-- Add project_id column to invitations table for project-specific invitations
ALTER TABLE public.invitations 
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.invitations.project_id IS 'Optional: specific project the user is invited to';

-- Create project_members table for granular project access
CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'editor',
  branch_name text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS on project_members
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own project memberships
CREATE POLICY "Users can view their project memberships"
ON public.project_members FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Policy: Users can join projects via invitation acceptance
CREATE POLICY "Users can join projects via invitation"
ON public.project_members FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Org admins can manage all project members
CREATE POLICY "Org admins can manage project members"
ON public.project_members FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN user_roles ur ON ur.organization_id = p.organization_id
    WHERE p.id = project_members.project_id
    AND ur.user_id = auth.uid()
    AND ur.role IN ('owner', 'admin')
  )
);

-- Update projects SELECT policy to include project_members visibility
DROP POLICY IF EXISTS "Org members can view projects" ON public.projects;

CREATE POLICY "Org members can view projects"
ON public.projects FOR SELECT TO authenticated
USING (
  organization_id IN (SELECT get_user_org_ids(auth.uid()))
  OR
  id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
);

-- Enable realtime for project_members
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_members;