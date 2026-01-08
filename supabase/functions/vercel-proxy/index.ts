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

    const targetOrigin = new URL(targetUrl).origin;

    // Fetch the content from Vercel
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': req.headers.get('User-Agent') || 'Mozilla/5.0',
        'Accept': req.headers.get('Accept') || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': req.headers.get('Accept-Language') || 'en-US,en;q=0.9',
      },
    });

    const contentType = response.headers.get('content-type') || 'text/html';
    
    // Create new headers, stripping X-Frame-Options
    const newHeaders = new Headers();
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'x-frame-options') {
        console.log('Stripped X-Frame-Options header');
        return;
      }
      if (lowerKey === 'content-security-policy') {
        const csp = value.replace(/frame-ancestors[^;]*(;|$)/gi, '');
        if (csp.trim()) {
          newHeaders.set(key, csp);
        }
        return;
      }
      newHeaders.set(key, value);
    });

    // Add CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });

    // For HTML responses, inject a <base> tag to fix relative URLs
    if (contentType.includes('text/html')) {
      let html = await response.text();
      
      // Inject <base> tag right after <head> to make all relative URLs resolve to Vercel
      const baseTag = `<base href="${targetOrigin}/">`;
      
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>\n${baseTag}`);
      } else if (html.includes('<HEAD>')) {
        html = html.replace('<HEAD>', `<HEAD>\n${baseTag}`);
      } else {
        // Fallback: prepend to document
        html = baseTag + html;
      }

      console.log('Injected base tag with origin:', targetOrigin);

      // EXPLICITLY set Content-Type to text/html - ensures browser renders as HTML
      newHeaders.set('Content-Type', 'text/html; charset=utf-8');

      return new Response(html, {
        status: response.status,
        headers: newHeaders,
      });
    }

    // For non-HTML responses, pass through as-is
    const body = await response.arrayBuffer();
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
