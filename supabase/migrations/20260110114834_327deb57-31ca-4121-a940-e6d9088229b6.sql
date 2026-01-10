-- ========================================
-- FIX: Restrict GitHub connection visibility to admins/owners only
-- ========================================

-- Drop the current overly permissive policy
DROP POLICY IF EXISTS "Org members can view github connections" ON github_connections;

-- Create stricter policy: only owners/admins can view
CREATE POLICY "Org admins can view github connections"
ON github_connections FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), organization_id, 'owner'::app_role) 
  OR has_role(auth.uid(), organization_id, 'admin'::app_role)
);