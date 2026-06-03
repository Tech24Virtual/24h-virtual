import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const partnerId = url.searchParams.get('partner');
    const slug = url.searchParams.get('slug');

    if (!partnerId && !slug) {
      return new Response(JSON.stringify({ error: 'partner or slug required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let pid = partnerId;
    let resolvedSlug = slug;

    if (!pid && slug) {
      const { data: partnerRow } = await supabase
        .from('white_label_partners')
        .select('id, partner_slug')
        .eq('partner_slug', slug)
        .maybeSingle();
      if (partnerRow) {
        pid = partnerRow.id;
        resolvedSlug = partnerRow.partner_slug;
      }
    }

    if (!resolvedSlug && pid) {
      const { data: p } = await supabase
        .from('white_label_partners')
        .select('partner_slug')
        .eq('id', pid)
        .maybeSingle();
      resolvedSlug = p?.partner_slug ?? '';
    }

    const { data: branding } = await supabase
      .from('white_label_branding')
      .select('company_name, favicon_url, logo_url, primary_color')
      .eq('partner_id', pid!)
      .maybeSingle();

    const name = branding?.company_name || 'Client Portal';
    const icon = branding?.favicon_url || branding?.logo_url || '/favicon.ico';
    const themeColor = branding?.primary_color || '#000000';
    const startUrl = resolvedSlug ? `/portal/${resolvedSlug}` : '/';

    const manifest = {
      name,
      short_name: name.length > 12 ? name.slice(0, 12) : name,
      start_url: startUrl,
      scope: startUrl,
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: themeColor,
      icons: [
        { src: icon, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: icon, sizes: '512x512', type: 'image/png', purpose: 'any' },
      ],
    };

    return new Response(JSON.stringify(manifest), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/manifest+json',
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
