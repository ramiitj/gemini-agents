-- Create role enum
create type public.app_role as enum ('owner', 'admin', 'editor', 'viewer');

-- Create profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Create organizations table
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

alter table public.organizations enable row level security;

-- Create user_roles table (separate from profiles for security)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  role app_role not null default 'viewer',
  created_at timestamptz default now(),
  unique (user_id, organization_id)
);

alter table public.user_roles enable row level security;

-- Create projects table
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade not null,
  name text not null,
  github_repo text,
  vercel_project_id text,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

alter table public.projects enable row level security;

-- Create conversations table
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  title text,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

alter table public.conversations enable row level security;

-- Create messages table
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  code_changes jsonb,
  status text check (status in ('pending', 'complete', 'error')),
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

alter table public.messages enable row level security;

-- Create deployments table
create table public.deployments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  conversation_id uuid references public.conversations(id),
  vercel_deployment_id text,
  status text not null default 'building' check (status in ('building', 'deployed', 'failed', 'pending_approval')),
  preview_url text,
  created_at timestamptz default now()
);

alter table public.deployments enable row level security;

-- Create approvals table
create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  deployment_id uuid references public.deployments(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  decision text not null default 'pending' check (decision in ('approved', 'rejected', 'pending')),
  comment text,
  created_at timestamptz default now()
);

alter table public.approvals enable row level security;

-- Create activity_log table
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references auth.users(id),
  action text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

alter table public.activity_log enable row level security;

-- Security definer function to check user role (prevents RLS recursion)
create or replace function public.has_role(_user_id uuid, _org_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and organization_id = _org_id
      and role = _role
  )
$$;

-- Function to check if user is member of organization
create or replace function public.is_org_member(_user_id uuid, _org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and organization_id = _org_id
  )
$$;

-- Function to get user's organizations
create or replace function public.get_user_org_ids(_user_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.user_roles
  where user_id = _user_id
$$;

-- Trigger function to create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  );
  return new;
end;
$$;

-- Trigger for auto-creating profiles
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS Policies

-- Profiles: Users can view all profiles, update their own
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Organizations: Members can view, owners/admins can update
create policy "Org members can view their organizations"
  on public.organizations for select
  to authenticated
  using (id in (select public.get_user_org_ids(auth.uid())));

create policy "Authenticated users can create organizations"
  on public.organizations for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Org owners/admins can update their organizations"
  on public.organizations for update
  to authenticated
  using (
    public.has_role(auth.uid(), id, 'owner') or
    public.has_role(auth.uid(), id, 'admin')
  );

-- User roles: Members can view roles in their org, owners/admins can manage
create policy "Org members can view roles"
  on public.user_roles for select
  to authenticated
  using (organization_id in (select public.get_user_org_ids(auth.uid())));

create policy "Org owners/admins can insert roles"
  on public.user_roles for insert
  to authenticated
  with check (
    public.has_role(auth.uid(), organization_id, 'owner') or
    public.has_role(auth.uid(), organization_id, 'admin')
  );

create policy "Org owners/admins can update roles"
  on public.user_roles for update
  to authenticated
  using (
    public.has_role(auth.uid(), organization_id, 'owner') or
    public.has_role(auth.uid(), organization_id, 'admin')
  );

create policy "Org owners/admins can delete roles"
  on public.user_roles for delete
  to authenticated
  using (
    public.has_role(auth.uid(), organization_id, 'owner') or
    public.has_role(auth.uid(), organization_id, 'admin')
  );

-- Projects: Org members can view, editors+ can manage
create policy "Org members can view projects"
  on public.projects for select
  to authenticated
  using (organization_id in (select public.get_user_org_ids(auth.uid())));

create policy "Org editors+ can create projects"
  on public.projects for insert
  to authenticated
  with check (
    public.has_role(auth.uid(), organization_id, 'owner') or
    public.has_role(auth.uid(), organization_id, 'admin') or
    public.has_role(auth.uid(), organization_id, 'editor')
  );

create policy "Org editors+ can update projects"
  on public.projects for update
  to authenticated
  using (
    public.has_role(auth.uid(), organization_id, 'owner') or
    public.has_role(auth.uid(), organization_id, 'admin') or
    public.has_role(auth.uid(), organization_id, 'editor')
  );

create policy "Org owners/admins can delete projects"
  on public.projects for delete
  to authenticated
  using (
    public.has_role(auth.uid(), organization_id, 'owner') or
    public.has_role(auth.uid(), organization_id, 'admin')
  );

-- Conversations: Project members can manage
create policy "Project members can view conversations"
  on public.conversations for select
  to authenticated
  using (
    project_id in (
      select p.id from public.projects p
      where p.organization_id in (select public.get_user_org_ids(auth.uid()))
    )
  );

create policy "Project editors+ can create conversations"
  on public.conversations for insert
  to authenticated
  with check (
    project_id in (
      select p.id from public.projects p
      where public.has_role(auth.uid(), p.organization_id, 'owner')
         or public.has_role(auth.uid(), p.organization_id, 'admin')
         or public.has_role(auth.uid(), p.organization_id, 'editor')
    )
  );

-- Messages: Conversation participants can manage
create policy "Conversation participants can view messages"
  on public.messages for select
  to authenticated
  using (
    conversation_id in (
      select c.id from public.conversations c
      join public.projects p on p.id = c.project_id
      where p.organization_id in (select public.get_user_org_ids(auth.uid()))
    )
  );

create policy "Conversation participants can create messages"
  on public.messages for insert
  to authenticated
  with check (
    conversation_id in (
      select c.id from public.conversations c
      join public.projects p on p.id = c.project_id
      where public.has_role(auth.uid(), p.organization_id, 'owner')
         or public.has_role(auth.uid(), p.organization_id, 'admin')
         or public.has_role(auth.uid(), p.organization_id, 'editor')
    )
  );

-- Deployments: Project members can view, editors+ can create
create policy "Project members can view deployments"
  on public.deployments for select
  to authenticated
  using (
    project_id in (
      select p.id from public.projects p
      where p.organization_id in (select public.get_user_org_ids(auth.uid()))
    )
  );

create policy "Project editors+ can create deployments"
  on public.deployments for insert
  to authenticated
  with check (
    project_id in (
      select p.id from public.projects p
      where public.has_role(auth.uid(), p.organization_id, 'owner')
         or public.has_role(auth.uid(), p.organization_id, 'admin')
         or public.has_role(auth.uid(), p.organization_id, 'editor')
    )
  );

create policy "Project editors+ can update deployments"
  on public.deployments for update
  to authenticated
  using (
    project_id in (
      select p.id from public.projects p
      where public.has_role(auth.uid(), p.organization_id, 'owner')
         or public.has_role(auth.uid(), p.organization_id, 'admin')
         or public.has_role(auth.uid(), p.organization_id, 'editor')
    )
  );

-- Approvals: Project members can view and manage their own
create policy "Project members can view approvals"
  on public.approvals for select
  to authenticated
  using (
    deployment_id in (
      select d.id from public.deployments d
      join public.projects p on p.id = d.project_id
      where p.organization_id in (select public.get_user_org_ids(auth.uid()))
    )
  );

create policy "Project members can create approvals"
  on public.approvals for insert
  to authenticated
  with check (
    auth.uid() = user_id and
    deployment_id in (
      select d.id from public.deployments d
      join public.projects p on p.id = d.project_id
      where p.organization_id in (select public.get_user_org_ids(auth.uid()))
    )
  );

create policy "Users can update their own approvals"
  on public.approvals for update
  to authenticated
  using (auth.uid() = user_id);

-- Activity log: Org members can view
create policy "Org members can view activity"
  on public.activity_log for select
  to authenticated
  using (organization_id in (select public.get_user_org_ids(auth.uid())));

create policy "Authenticated users can create activity"
  on public.activity_log for insert
  to authenticated
  with check (
    organization_id in (select public.get_user_org_ids(auth.uid()))
  );

-- Enable realtime for messages and activity
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.activity_log;
alter table public.messages replica identity full;
alter table public.activity_log replica identity full;