-- ========================================
-- FIX: Restrict profile visibility
-- ========================================

-- 1. Drop the current overly permissive policy
DROP POLICY IF EXISTS "Users can view profiles in their organizations" ON profiles;

-- 2. Create strict policy: only own profile OR admins/owners can see full profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can view org member profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT ur.user_id FROM user_roles ur
    WHERE ur.organization_id IN (
      SELECT ur2.organization_id FROM user_roles ur2
      WHERE ur2.user_id = auth.uid()
      AND ur2.role IN ('owner', 'admin')
    )
  )
);

-- 3. Create a secure function for limited profile data (name/avatar only)
-- This allows org members to see teammate names without exposing emails
CREATE OR REPLACE FUNCTION public.get_org_member_profiles(_org_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  role app_role
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    ur.role
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.id
  WHERE ur.organization_id = _org_id
  AND _org_id IN (SELECT get_user_org_ids(auth.uid()))
$$;