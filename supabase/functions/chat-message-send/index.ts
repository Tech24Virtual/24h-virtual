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
    const { token, conversation_id, body: messageBody } = await req.json();
    if (!token || !conversation_id || !messageBody || typeof messageBody !== 'string' || messageBody.length > 4000) {
      return new Response(JSON.stringify({ error: 'invalid_payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Verify token matches conversation
    const { data: convo } = await supabase
      .from('chat_conversations')
      .select('id, deployment_id, status, ai_state, chat_deployments!inner(widget_token)')
      .eq('id', conversation_id)
      .maybeSingle();

    // @ts-ignore nested join
    if (!convo || convo.chat_deployments?.widget_token !== token) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Insert visitor message
    await supabase.from('chat_messages').insert({
      conversation_id,
      sender_type: 'visitor',
      body: messageBody.trim(),
    });

    // Get AI mode
    const { data: ai } = await supabase.from('chat_ai_configs').select('*').eq('deployment_id', convo.deployment_id).maybeSingle();
    const mode = ai?.mode || 'agent_only';

    // Check escalation keywords
    const lower = messageBody.toLowerCase();
    const keywords: string[] = ai?.escalation_keywords || [];
    const requestsHuman = keywords.some(k => lower.includes(k.toLowerCase()));

    if ((mode === 'ai_first' || mode === 'ai_only') && convo.ai_state !== 'handed_off' && !requestsHuman) {
      // Trigger AI response
      try {
        await supabase.functions.invoke('chat-ai-respond', {
          body: { conversation_id, deployment_id: convo.deployment_id },
        });
      } catch (e) {
        console.error('AI invoke failed', e);
      }
    } else if (requestsHuman || mode === 'agent_only') {
      // Hand off
      await supabase.from('chat_conversations').update({
        status: 'queued',
        ai_state: requestsHuman ? 'handed_off' : 'disabled',
      }).eq('id', conversation_id);

      if (requestsHuman) {
        await supabase.from('chat_handoff_events').insert({
          conversation_id,
          trigger_type: 'keyword',
          trigger_detail: 'visitor requested human',
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server_error', detail: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
