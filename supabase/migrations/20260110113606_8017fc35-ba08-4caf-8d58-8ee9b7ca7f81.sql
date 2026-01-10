-- ========================================
-- SECURITY FIXES MIGRATION
-- ========================================

-- 1. Fix profiles table - restrict to own profile + org members
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;

CREATE POLICY "Users can view profiles in their organizations"
ON profiles FOR SELECT
TO authenticated
USING (
  id = auth.uid() 
  OR id IN (
    SELECT ur.user_id FROM user_roles ur
    WHERE ur.organization_id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

-- 2. Fix invitations table - restrict to admins + own invitations
DROP POLICY IF EXISTS "View org invitations" ON invitations;

CREATE POLICY "Admins and invitees can view invitations"
ON invitations FOR SELECT
TO authenticated
USING (
  -- Admins/owners can see org invitations
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.organization_id = invitations.organization_id
    AND user_roles.role IN ('owner', 'admin')
  )
  -- Users can see their own pending invitations
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- 3. Allow invitees to accept their own invitations
CREATE POLICY "Invitees can accept their own invitations"
ON invitations FOR UPDATE
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status = 'pending'
)
WITH CHECK (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status = 'accepted'
);

-- 4. Allow users to join organizations via valid invitations
CREATE POLICY "Users can join org via invitation"
ON user_roles FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM invitations
    WHERE invitations.organization_id = user_roles.organization_id
    AND invitations.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND invitations.status = 'pending'
    AND invitations.expires_at > now()
  )
);