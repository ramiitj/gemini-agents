import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Headers to skip from upstream (we control these ourselves)
const skipHeaders = new Set([
  'content-type',
  'content-length',
  'content-encoding',
  'transfer-encoding',
  'connection',
  'x-frame-options',
  'content-security-policy',
  'x-content-type-options',
]);

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

    const targetOrigin = new URL(targetUrl).origin;

    // Fetch the content from Vercel
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': req.headers.get('User-Agent') || 'Mozilla/5.0',
        'Accept': req.headers.get('Accept') || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': req.headers.get('Accept-Language') || 'en-US,en;q=0.9',
      },
    });

    const upstreamContentType = response.headers.get('content-type') || 'text/html';
    
    // Build response headers as a plain object (not Headers instance)
    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
    };

    // Copy safe headers from upstream
    response.headers.forEach((value, key) => {
      if (!skipHeaders.has(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });

    // For HTML responses, inject <base> tag and set proper Content-Type
    if (upstreamContentType.includes('text/html')) {
      let html = await response.text();
      
      // Inject <base> tag right after <head>
      const baseTag = `<base href="${targetOrigin}/">`;
      
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>\n${baseTag}`);
      } else if (html.includes('<HEAD>')) {
        html = html.replace('<HEAD>', `<HEAD>\n${baseTag}`);
      } else {
        html = baseTag + html;
      }

      console.log('Injected base tag with origin:', targetOrigin);
      console.log('Returning HTML with Content-Type: text/html; charset=utf-8');

      // CRITICAL: Set Content-Type explicitly for HTML
      responseHeaders['Content-Type'] = 'text/html; charset=utf-8';

      return new Response(html, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    // For non-HTML responses, preserve original content-type
    responseHeaders['Content-Type'] = upstreamContentType;
    
    const body = await response.arrayBuffer();
    return new Response(body, {
      status: response.status,
      headers: responseHeaders,
    });

  } catch (error: any) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
