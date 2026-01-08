-- Create the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Table: agent_runs - Track AI agent workflow executions
CREATE TABLE IF NOT EXISTS public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  current_step text,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

-- RLS policies for agent_runs (drop if exists to avoid conflicts)
DROP POLICY IF EXISTS "Project members can view agent runs" ON public.agent_runs;
CREATE POLICY "Project members can view agent runs"
ON public.agent_runs FOR SELECT
USING (project_id IN (
  SELECT p.id FROM projects p
  WHERE p.organization_id IN (SELECT get_user_org_ids(auth.uid()))
));

DROP POLICY IF EXISTS "Project editors+ can create agent runs" ON public.agent_runs;
CREATE POLICY "Project editors+ can create agent runs"
ON public.agent_runs FOR INSERT
WITH CHECK (project_id IN (
  SELECT p.id FROM projects p
  WHERE has_role(auth.uid(), p.organization_id, 'owner'::app_role)
     OR has_role(auth.uid(), p.organization_id, 'admin'::app_role)
     OR has_role(auth.uid(), p.organization_id, 'editor'::app_role)
));

DROP POLICY IF EXISTS "Project editors+ can update agent runs" ON public.agent_runs;
CREATE POLICY "Project editors+ can update agent runs"
ON public.agent_runs FOR UPDATE
USING (project_id IN (
  SELECT p.id FROM projects p
  WHERE has_role(auth.uid(), p.organization_id, 'owner'::app_role)
     OR has_role(auth.uid(), p.organization_id, 'admin'::app_role)
     OR has_role(auth.uid(), p.organization_id, 'editor'::app_role)
));

-- Table: github_connections - Store GitHub integration status per org
CREATE TABLE IF NOT EXISTS public.github_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  github_username text,
  connected_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.github_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies for github_connections
DROP POLICY IF EXISTS "Org members can view github connections" ON public.github_connections;
CREATE POLICY "Org members can view github connections"
ON public.github_connections FOR SELECT
USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "Org owners/admins can manage github connections" ON public.github_connections;
CREATE POLICY "Org owners/admins can manage github connections"
ON public.github_connections FOR ALL
USING (has_role(auth.uid(), organization_id, 'owner'::app_role)
    OR has_role(auth.uid(), organization_id, 'admin'::app_role));

-- Table: vercel_connections - Store Vercel integration status per org
CREATE TABLE IF NOT EXISTS public.vercel_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  vercel_team_id text,
  connected_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vercel_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies for vercel_connections
DROP POLICY IF EXISTS "Org members can view vercel connections" ON public.vercel_connections;
CREATE POLICY "Org members can view vercel connections"
ON public.vercel_connections FOR SELECT
USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "Org owners/admins can manage vercel connections" ON public.vercel_connections;
CREATE POLICY "Org owners/admins can manage vercel connections"
ON public.vercel_connections FOR ALL
USING (has_role(auth.uid(), organization_id, 'owner'::app_role)
    OR has_role(auth.uid(), organization_id, 'admin'::app_role));

-- Trigger for updated_at on agent_runs
DROP TRIGGER IF EXISTS update_agent_runs_updated_at ON public.agent_runs;
CREATE TRIGGER update_agent_runs_updated_at
BEFORE UPDATE ON public.agent_runs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for agent_runs to stream status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_runs;