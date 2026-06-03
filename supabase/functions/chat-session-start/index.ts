import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405, headers: corsHeaders });

  try {
    const body = await req.json();
    const { token, visitor_uid, name, email, phone } = body;
    if (!token || !visitor_uid || typeof token !== 'string' || typeof visitor_uid !== 'string') {
      return new Response(JSON.stringify({ error: 'invalid_payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: deployment } = await supabase
      .from('chat_deployments')
      .select('id, ownership_mode, direct_client_id, wl_partner_id, wl_client_id, status')
      .eq('widget_token', token)
      .maybeSingle();

    if (!deployment || deployment.status !== 'active') {
      return new Response(JSON.stringify({ error: 'deployment_unavailable' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Upsert visitor
    const { data: visitor } = await supabase
      .from('chat_visitors')
      .upsert({
        deployment_id: deployment.id,
        visitor_uid,
        name: name || null,
        email: email || null,
        phone: phone || null,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: 'deployment_id,visitor_uid' })
      .select()
      .single();

    if (!visitor) {
      return new Response(JSON.stringify({ error: 'visitor_failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Determine initial status based on AI mode
    const { data: ai } = await supabase.from('chat_ai_configs').select('mode').eq('deployment_id', deployment.id).maybeSingle();
    const aiMode = ai?.mode || 'agent_only';
    const initialStatus = aiMode === 'agent_only' ? 'queued' : 'new';
    const initialAiState = aiMode === 'agent_only' ? 'disabled' : 'idle';

    const { data: conversation } = await supabase
      .from('chat_conversations')
      .insert({
        deployment_id: deployment.id,
        visitor_id: visitor.id,
        ownership_mode: deployment.ownership_mode,
        direct_client_id: deployment.direct_client_id,
        wl_partner_id: deployment.wl_partner_id,
        wl_client_id: deployment.wl_client_id,
        status: initialStatus,
        ai_state: initialAiState,
      })
      .select()
      .single();

    return new Response(JSON.stringify({
      conversation_id: conversation?.id,
      visitor_id: visitor.id,
      ai_mode: aiMode,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server_error', detail: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
