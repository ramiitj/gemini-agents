-- Create agent_sessions table for persisting agent context
CREATE TABLE public.agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Pointers to GitHub (GitHub is source of truth)
  github_owner TEXT,
  github_repo TEXT,
  current_branch TEXT,
  
  -- Temporary in-memory state (cleared after commit)
  staged_files JSONB DEFAULT '{}',
  
  -- Vercel project reference
  vercel_project_id TEXT,
  
  -- Agent mode: 'chat' or 'execution'
  agent_mode TEXT DEFAULT 'chat',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
  ON public.agent_sessions FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own sessions
CREATE POLICY "Users can insert own sessions"
  ON public.agent_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions"
  ON public.agent_sessions FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
  ON public.agent_sessions FOR DELETE
  USING (user_id = auth.uid());

-- Enable realtime for agent_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_sessions;

-- Add trigger for updated_at
CREATE TRIGGER update_agent_sessions_updated_at
  BEFORE UPDATE ON public.agent_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();