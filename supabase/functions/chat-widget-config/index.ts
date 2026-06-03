import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token || token.length < 8 || token.length > 128) {
      return new Response(JSON.stringify({ error: 'invalid_token' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: deployment, error: depErr } = await supabase
      .from('chat_deployments')
      .select('id, ownership_mode, display_name, status')
      .eq('widget_token', token)
      .maybeSingle();

    if (depErr || !deployment) {
      return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (deployment.status !== 'active') {
      return new Response(JSON.stringify({ error: 'inactive' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const [{ data: brand }, { data: ai }] = await Promise.all([
      supabase.from('chat_brand_configs').select('*').eq('deployment_id', deployment.id).maybeSingle(),
      supabase.from('chat_ai_configs').select('mode').eq('deployment_id', deployment.id).maybeSingle(),
    ]);

    return new Response(
      JSON.stringify({
        deployment_id: deployment.id,
        display_name: deployment.display_name,
        ownership_mode: deployment.ownership_mode,
        brand: brand || null,
        ai_mode: ai?.mode || 'agent_only',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server_error', detail: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
