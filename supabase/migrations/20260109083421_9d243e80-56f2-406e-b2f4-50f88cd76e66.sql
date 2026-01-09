-- Add attachments support to team_comments
ALTER TABLE public.team_comments 
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add project_id for project-level discussions (not just change_request specific)
ALTER TABLE public.team_comments 
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

-- Make change_request_id optional (allow project-level comments)
ALTER TABLE public.team_comments 
  ALTER COLUMN change_request_id DROP NOT NULL;

-- Add constraint to ensure at least one scope is set
ALTER TABLE public.team_comments 
  ADD CONSTRAINT team_comment_scope 
  CHECK (project_id IS NOT NULL OR change_request_id IS NOT NULL);

-- Add versioning columns to code_changes
ALTER TABLE public.code_changes 
  ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS version_label TEXT,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;

-- Create storage bucket for team attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-attachments', 'team-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for team attachments
CREATE POLICY "Authenticated users can upload team attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'team-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view team attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-attachments');

CREATE POLICY "Users can delete own team attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'team-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update RLS for team_comments to support project_id
DROP POLICY IF EXISTS "Project members can create comments" ON public.team_comments;
CREATE POLICY "Project members can create comments" 
ON public.team_comments FOR INSERT
WITH CHECK (
  (change_request_id IN (
    SELECT cr.id FROM change_requests cr
    JOIN projects p ON p.id = cr.project_id
    WHERE p.organization_id IN (SELECT get_user_org_ids(auth.uid()))
  ))
  OR
  (project_id IN (
    SELECT p.id FROM projects p
    WHERE p.organization_id IN (SELECT get_user_org_ids(auth.uid()))
  ))
);

DROP POLICY IF EXISTS "Project members can view comments" ON public.team_comments;
CREATE POLICY "Project members can view comments" 
ON public.team_comments FOR SELECT
USING (
  (change_request_id IN (
    SELECT cr.id FROM change_requests cr
    JOIN projects p ON p.id = cr.project_id
    WHERE p.organization_id IN (SELECT get_user_org_ids(auth.uid()))
  ))
  OR
  (project_id IN (
    SELECT p.id FROM projects p
    WHERE p.organization_id IN (SELECT get_user_org_ids(auth.uid()))
  ))
);