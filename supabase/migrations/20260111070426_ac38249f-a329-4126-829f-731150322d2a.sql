-- Fix invitations RLS policies to use auth.email() instead of querying auth.users directly

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins and invitees can view invitations" ON invitations;
DROP POLICY IF EXISTS "Invitees can accept their own invitations" ON invitations;

-- Create new SELECT policy using auth.email()
CREATE POLICY "Admins and invitees can view invitations" 
ON invitations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.organization_id = invitations.organization_id
    AND user_roles.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role])
  )
  OR email = auth.email()
);

-- Create new UPDATE policy using auth.email()
CREATE POLICY "Invitees can accept their own invitations" 
ON invitations FOR UPDATE
USING (email = auth.email())
WITH CHECK (email = auth.email());