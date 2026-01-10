-- Admin users table (separate from regular user roles)
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  UNIQUE(user_id)
);

-- Platform settings table (branding, etc.)
CREATE TABLE public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

-- API/Model configuration table
CREATE TABLE public.model_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_key TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

-- System behavior/prompts table
CREATE TABLE public.system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key TEXT NOT NULL UNIQUE,
  prompt_content TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

-- Billing configuration table
CREATE TABLE public.billing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key TEXT NOT NULL UNIQUE,
  service_name TEXT NOT NULL,
  pricing JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Admin activity log
CREATE TABLE public.admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all admin tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Admin check function
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = _user_id)
$$;

-- Super admin check function
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = _user_id AND role = 'super_admin')
$$;

-- RLS Policies for admin_users
CREATE POLICY "Admins can view admin_users" ON public.admin_users
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Super admins can insert admin_users" ON public.admin_users
  FOR INSERT WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update admin_users" ON public.admin_users
  FOR UPDATE USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete admin_users" ON public.admin_users
  FOR DELETE USING (public.is_super_admin(auth.uid()));

-- RLS Policies for platform_settings
CREATE POLICY "Admins can view platform_settings" ON public.platform_settings
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert platform_settings" ON public.platform_settings
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update platform_settings" ON public.platform_settings
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete platform_settings" ON public.platform_settings
  FOR DELETE USING (public.is_admin(auth.uid()));

-- RLS Policies for model_config
CREATE POLICY "Admins can view model_config" ON public.model_config
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert model_config" ON public.model_config
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update model_config" ON public.model_config
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete model_config" ON public.model_config
  FOR DELETE USING (public.is_admin(auth.uid()));

-- RLS Policies for system_prompts
CREATE POLICY "Admins can view system_prompts" ON public.system_prompts
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert system_prompts" ON public.system_prompts
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update system_prompts" ON public.system_prompts
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete system_prompts" ON public.system_prompts
  FOR DELETE USING (public.is_admin(auth.uid()));

-- RLS Policies for billing_config
CREATE POLICY "Admins can view billing_config" ON public.billing_config
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert billing_config" ON public.billing_config
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update billing_config" ON public.billing_config
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete billing_config" ON public.billing_config
  FOR DELETE USING (public.is_admin(auth.uid()));

-- RLS Policies for admin_activity_log
CREATE POLICY "Admins can view admin_activity_log" ON public.admin_activity_log
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert admin_activity_log" ON public.admin_activity_log
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- Insert initial admin user (ramganuthula@gmail.com with id from auth.users)
INSERT INTO public.admin_users (user_id, role)
SELECT id, 'super_admin' FROM auth.users WHERE email = 'ramganuthula@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- Insert default platform settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('branding', '{"name": "GetHolocron", "tagline": "AI-Powered Product Development", "primaryColor": "#6366F1", "logoUrl": "/logo.svg", "faviconUrl": "/favicon.svg"}'),
  ('features', '{"webSearch": true, "imageSearch": true, "codeGeneration": true, "teamCollaboration": true}'),
  ('seo', '{"title": "GetHolocron - AI-Powered Product Development Platform", "description": "Evolve your product together. Every team member experiments with their ideas in real-time.", "keywords": "AI product development, team collaboration, code previews, no-code"}')
ON CONFLICT (key) DO NOTHING;

-- Insert default model config
INSERT INTO public.model_config (model_key, provider, model_name, is_active, settings) VALUES
  ('default', 'google', 'gemini-2.5-pro', true, '{"temperature": 0.7, "maxTokens": 4096}'),
  ('fast', 'google', 'gemini-2.5-flash', true, '{"temperature": 0.5, "maxTokens": 2048}'),
  ('reasoning', 'openai', 'gpt-5', true, '{"temperature": 0.6, "maxTokens": 8192}')
ON CONFLICT (model_key) DO NOTHING;

-- Insert default system prompt
INSERT INTO public.system_prompts (prompt_key, prompt_content, description, is_active) VALUES
  ('main_agent', 'You are an AI coding agent for GetHolocron, an AI-powered product development platform. You help teams build and iterate on their products through natural language conversations.', 'Main AI agent system prompt', true)
ON CONFLICT (prompt_key) DO NOTHING;

-- Insert default billing config
INSERT INTO public.billing_config (service_key, service_name, pricing, is_active) VALUES
  ('ai_requests', 'AI API Requests', '{"unit": "request", "pricePerUnit": 0.001, "freeQuota": 1000}', true),
  ('deployments', 'Deployments', '{"unit": "deployment", "pricePerUnit": 0.05, "freeQuota": 50}', true),
  ('storage', 'File Storage', '{"unit": "GB", "pricePerUnit": 0.10, "freeQuota": 5}', true)
ON CONFLICT (service_key) DO NOTHING;