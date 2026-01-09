import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use PageSpeed Insights API for screenshot (works without API key, but rate limited)
    const apiKey = Deno.env.get('GOOGLE_API_KEY');
    let apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&category=performance&strategy=desktop`;
    
    if (apiKey) {
      apiUrl += `&key=${apiKey}`;
    }
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    // Extract screenshot from lighthouseResult
    const screenshot = data?.lighthouseResult?.audits?.['final-screenshot']?.details?.data;
    
    if (screenshot) {
      return new Response(
        JSON.stringify({ screenshot }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Fallback: return error with more detail
    return new Response(
      JSON.stringify({ 
        error: 'Could not capture screenshot',
        details: data?.error?.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
