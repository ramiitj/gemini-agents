import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, vercelProjectId } = await req.json();
    
    if (!projectId || !vercelProjectId) {
      return new Response(
        JSON.stringify({ error: 'projectId and vercelProjectId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate authentication and verify user has editor+ access to the project
    await validateAuth(req, { projectId, requiredRole: 'editor' });

    // Use service client for the update (after auth is validated)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Updating project ${projectId} with Vercel ID: ${vercelProjectId}`);

    const { error } = await supabase
      .from('projects')
      .update({ vercel_project_id: vercelProjectId })
      .eq('id', projectId);

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, projectId, vercelProjectId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error updating project:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Access denied') || message.includes('Authorization') ? 401 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
