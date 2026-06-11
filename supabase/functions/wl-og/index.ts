import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// deploy with: supabase functions deploy wl-og --no-verify-jwt

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');

    if (!slug) {
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: '/' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: partnerRow } = await supabase
      .from('white_label_partners')
      .select('id')
      .eq('partner_slug', slug)
      .maybeSingle();

    if (!partnerRow) {
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: '/' },
      });
    }

    const { data: branding } = await supabase
      .from('white_label_branding')
      .select('company_name, welcome_message, logo_url, favicon_url')
      .eq('partner_id', partnerRow.id)
      .maybeSingle();

    const companyName = branding?.company_name || 'Client Portal';
    const description = branding?.welcome_message || `Welcome to ${companyName}`;
    const ogImage = branding?.logo_url || branding?.favicon_url || '';
    const portalUrl = `/portal/${slug}`;

    const ogImageTag = ogImage
      ? `  <meta property="og:image" content="${escapeHtml(ogImage)}" />\n  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />`
      : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(companyName)}</title>
  <meta property="og:title" content="${escapeHtml(companyName)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
${ogImageTag}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(companyName)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(portalUrl)}" />
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(portalUrl)}">${escapeHtml(companyName)}</a>&hellip;</p>
</body>
</html>`;

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
