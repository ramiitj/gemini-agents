-- Create agent_activity table for real-time agent status tracking
CREATE TABLE IF NOT EXISTS public.agent_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  conversation_id UUID,
  activity_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_activity;
ALTER TABLE public.agent_activity REPLICA IDENTITY FULL;

-- RLS
ALTER TABLE public.agent_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view agent activity"
  ON public.agent_activity FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      WHERE p.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    )
  );

CREATE POLICY "System can insert agent activity"
  ON public.agent_activity FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update agent activity"
  ON public.agent_activity FOR UPDATE TO authenticated
  USING (true);

-- Auto-cleanup old activities (keep last 100 per project)
CREATE OR REPLACE FUNCTION public.cleanup_old_agent_activity()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.agent_activity
  WHERE id IN (
    SELECT id FROM public.agent_activity
    WHERE project_id = NEW.project_id
    ORDER BY created_at DESC
    OFFSET 100
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER cleanup_agent_activity_trigger
AFTER INSERT ON public.agent_activity
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_old_agent_activity();