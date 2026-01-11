-- Create design_gallery table for saving imported Stitch designs
CREATE TABLE public.design_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  image_url TEXT,
  medium TEXT DEFAULT 'web' CHECK (medium IN ('web', 'app')),
  tags TEXT[] DEFAULT '{}',
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_design_gallery_org ON public.design_gallery(organization_id);
CREATE INDEX idx_design_gallery_created_by ON public.design_gallery(created_by);
CREATE INDEX idx_design_gallery_created_at ON public.design_gallery(created_at DESC);

-- Enable RLS
ALTER TABLE public.design_gallery ENABLE ROW LEVEL SECURITY;

-- Users can view designs from their organizations
CREATE POLICY "Users can view org designs" ON public.design_gallery
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

-- Users can insert designs for their organizations
CREATE POLICY "Users can insert designs" ON public.design_gallery
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

-- Users can update their own designs
CREATE POLICY "Users can update own designs" ON public.design_gallery
  FOR UPDATE USING (created_by = auth.uid());

-- Users can delete their own designs
CREATE POLICY "Users can delete own designs" ON public.design_gallery
  FOR DELETE USING (created_by = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.design_gallery;

-- Add updated_at trigger
CREATE TRIGGER update_design_gallery_updated_at
  BEFORE UPDATE ON public.design_gallery
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();