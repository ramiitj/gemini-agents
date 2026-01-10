-- ========================================
-- FIX: Make team-attachments bucket private and restrict access to org members
-- ========================================

-- Make the bucket private (no direct public URL access)
UPDATE storage.buckets SET public = false WHERE id = 'team-attachments';

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view team attachments" ON storage.objects;

-- Create organization-scoped SELECT policy
-- Users can only view attachments uploaded by members of their organizations
CREATE POLICY "Org members can view team attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'team-attachments' AND
  -- Extract user_id from path: {user_id}/{filename}
  (storage.foldername(name))[1]::uuid IN (
    SELECT ur.user_id FROM user_roles ur
    WHERE ur.organization_id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

-- Update INSERT policy to also verify org membership
DROP POLICY IF EXISTS "Authenticated users can upload team attachments" ON storage.objects;

CREATE POLICY "Org members can upload team attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'team-attachments' AND 
  auth.role() = 'authenticated' AND
  -- User can only upload to their own folder
  auth.uid()::text = (storage.foldername(name))[1]
);