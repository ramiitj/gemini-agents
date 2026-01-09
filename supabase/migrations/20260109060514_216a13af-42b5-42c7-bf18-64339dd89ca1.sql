-- Fix overly permissive RLS policies for agent_activity

-- Drop the permissive policies
DROP POLICY IF EXISTS "System can insert agent activity" ON public.agent_activity;
DROP POLICY IF EXISTS "System can update agent activity" ON public.agent_activity;

-- Create proper INSERT policy - only project editors+ can insert
CREATE POLICY "Project editors can insert agent activity"
  ON public.agent_activity FOR INSERT TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
      WHERE has_role(auth.uid(), p.organization_id, 'owner'::app_role)
         OR has_role(auth.uid(), p.organization_id, 'admin'::app_role)
         OR has_role(auth.uid(), p.organization_id, 'editor'::app_role)
    )
  );

-- Create proper UPDATE policy - only project editors+ can update
CREATE POLICY "Project editors can update agent activity"
  ON public.agent_activity FOR UPDATE TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      WHERE has_role(auth.uid(), p.organization_id, 'owner'::app_role)
         OR has_role(auth.uid(), p.organization_id, 'admin'::app_role)
         OR has_role(auth.uid(), p.organization_id, 'editor'::app_role)
    )
  );