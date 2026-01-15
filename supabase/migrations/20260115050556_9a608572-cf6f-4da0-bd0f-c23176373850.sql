-- Phase 1: Fix organizations SELECT policy to allow creator immediate visibility
-- This fixes "new row violates row-level security policy" on INSERT...RETURNING

DROP POLICY IF EXISTS "Org members can view their organizations" ON public.organizations;

CREATE POLICY "Org members can view their organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  (created_by = auth.uid()) OR (id IN (SELECT get_user_org_ids(auth.uid())))
);