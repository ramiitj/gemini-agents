import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// deno-lint-ignore no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

/**
 * Validates the Authorization header and returns the authenticated user's ID
 * Also verifies the user has access to the specified project (if projectId is provided)
 * 
 * @throws Error if authentication fails or user doesn't have access
 */
export async function validateAuth(
  req: Request,
  options?: {
    projectId?: string;
    requiredRole?: 'viewer' | 'editor' | 'admin' | 'owner';
  }
): Promise<{ userId: string; supabase: AnySupabaseClient }> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    throw new Error('Missing Authorization header');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration missing');
  }

  // Create client with user's JWT for RLS enforcement
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  // Verify the user's session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('Invalid or expired authentication token');
  }

  // If projectId is provided, verify user has access via RLS
  if (options?.projectId) {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, organization_id')
      .eq('id', options.projectId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found or access denied');
    }

    // If a specific role is required, check it
    if (options.requiredRole) {
      const roleHierarchy = ['viewer', 'editor', 'admin', 'owner'];
      const requiredIndex = roleHierarchy.indexOf(options.requiredRole);
      
      // Check user's role in the organization
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('organization_id', project.organization_id)
        .eq('user_id', user.id)
        .single();

      if (roleError || !userRole) {
        throw new Error('Access denied: no role in organization');
      }

      const userRoleIndex = roleHierarchy.indexOf(userRole.role);
      if (userRoleIndex < requiredIndex) {
        throw new Error(`Access denied: requires ${options.requiredRole} role or higher`);
      }
    }
  }

  return { userId: user.id, supabase };
}

/**
 * Creates a service-role Supabase client for operations that need elevated privileges
 * Use sparingly and only after validating user access with validateAuth
 */
export function getServiceClient(): ReturnType<typeof createClient> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase service configuration missing');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}
