-- Create SECURITY DEFINER function to get user's project IDs (breaks recursion cycle)
CREATE OR REPLACE FUNCTION public.get_user_project_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT project_id FROM public.project_members WHERE user_id = _user_id
$$;

-- Create SECURITY DEFINER function to check if user is org admin for a project
CREATE OR REPLACE FUNCTION public.is_org_admin_for_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.projects p
    JOIN public.user_roles ur ON ur.organization_id = p.organization_id
    WHERE p.id = _project_id
    AND ur.user_id = _user_id
    AND ur.role IN ('owner', 'admin')
  )
$$;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Org members can view projects" ON public.projects;
DROP POLICY IF EXISTS "Org admins can manage project members" ON public.project_members;

-- Recreate projects SELECT policy using SECURITY DEFINER function
CREATE POLICY "Org members can view projects"
ON public.projects FOR SELECT TO authenticated
USING (
  organization_id IN (SELECT get_user_org_ids(auth.uid()))
  OR
  id IN (SELECT get_user_project_ids(auth.uid()))
);

-- Recreate project_members admin policy using SECURITY DEFINER function
CREATE POLICY "Org admins can manage project members"
ON public.project_members FOR ALL TO authenticated
USING (is_org_admin_for_project(auth.uid(), project_id));