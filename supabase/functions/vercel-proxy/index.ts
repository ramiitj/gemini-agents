import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get('url');
    
    if (!targetUrl) {
      return new Response('Missing url parameter', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log('Proxying request to:', targetUrl);

    // Fetch the content from Vercel
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': req.headers.get('User-Agent') || 'Mozilla/5.0',
        'Accept': req.headers.get('Accept') || '*/*',
        'Accept-Language': req.headers.get('Accept-Language') || 'en-US,en;q=0.9',
      },
    });

    // Get the response body
    const body = await response.arrayBuffer();

    // Create new headers, stripping X-Frame-Options
    const newHeaders = new Headers();
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      // Skip headers that prevent iframe embedding
      if (lowerKey === 'x-frame-options') {
        console.log('Stripped X-Frame-Options header');
        return;
      }
      if (lowerKey === 'content-security-policy') {
        // Remove frame-ancestors directive
        const csp = value.replace(/frame-ancestors[^;]*(;|$)/gi, '');
        if (csp.trim()) {
          newHeaders.set(key, csp);
        }
        console.log('Modified Content-Security-Policy header');
        return;
      }
      newHeaders.set(key, value);
    });

    // Add CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });

    return new Response(body, {
      status: response.status,
      headers: newHeaders,
    });

  } catch (error: any) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
