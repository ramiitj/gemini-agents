-- Create an admin-only function to get all profiles with filtered fields
-- This bypasses RLS safely while ensuring only admins can access it
CREATE OR REPLACE FUNCTION public.get_all_profiles_admin()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  username text,
  avatar_url text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.username,
    p.avatar_url,
    p.created_at
  FROM profiles p
  WHERE is_admin(auth.uid())
  ORDER BY p.created_at DESC
$$;