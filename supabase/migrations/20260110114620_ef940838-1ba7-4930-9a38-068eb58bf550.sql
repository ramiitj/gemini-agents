-- ========================================
-- STRICTER FIX: Only own profile access via table
-- ========================================

-- Drop the admin policy - all org member lookups go through secure function
DROP POLICY IF EXISTS "Admins can view org member profiles" ON profiles;

-- The "Users can view own profile" policy remains, which only allows:
-- USING (id = auth.uid())
-- 
-- For viewing org members, use the get_org_member_profiles() function
-- which returns only name/avatar (no email)