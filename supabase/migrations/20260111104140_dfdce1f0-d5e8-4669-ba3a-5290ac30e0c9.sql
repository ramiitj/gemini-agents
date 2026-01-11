-- Fix user_roles INSERT policies to allow self-assignment as owner when creating organization

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Org owners/admins can insert roles" ON user_roles;

-- Policy 1: Allow users to self-assign owner role on organizations they created
CREATE POLICY "Creator can self-assign owner role"
ON user_roles FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  role = 'owner' AND
  EXISTS (
    SELECT 1 FROM organizations
    WHERE organizations.id = user_roles.organization_id
    AND organizations.created_by = auth.uid()
  )
);

-- Policy 2: Allow existing owners/admins to add other roles
CREATE POLICY "Org owners/admins can add other roles"
ON user_roles FOR INSERT
WITH CHECK (
  has_role(auth.uid(), organization_id, 'owner'::app_role) OR
  has_role(auth.uid(), organization_id, 'admin'::app_role)
);

-- Fix invitation policy to use auth.email() instead of auth.users
DROP POLICY IF EXISTS "Users can join org via invitation" ON user_roles;

CREATE POLICY "Users can join org via invitation"
ON user_roles FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM invitations
    WHERE invitations.organization_id = user_roles.organization_id
    AND invitations.email = auth.email()
    AND invitations.status = 'pending'
    AND invitations.expires_at > now()
  )
);