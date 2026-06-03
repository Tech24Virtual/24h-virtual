import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { conversation_id, deployment_id } = await req.json();
    if (!conversation_id || !deployment_id) {
      return new Response(JSON.stringify({ error: 'invalid_payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const [{ data: ai }, { data: messages }] = await Promise.all([
      supabase.from('chat_ai_configs').select('*').eq('deployment_id', deployment_id).maybeSingle(),
      supabase.from('chat_messages').select('sender_type, body').eq('conversation_id', conversation_id).order('created_at', { ascending: true }).limit(20),
    ]);

    if (!ai) return new Response(JSON.stringify({ error: 'no_ai_config' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const faqText = (ai.faqs || []).map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
    const systemPrompt = `${ai.system_instructions || 'You are a helpful customer service AI.'}\n\nFAQs you can use:\n${faqText}\n\nIf you cannot answer confidently, say "Let me connect you with an agent" and stop.`;

    const chatHistory = (messages || []).map((m: any) => ({
      role: m.sender_type === 'visitor' ? 'user' : 'assistant',
      content: m.body,
    }));

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'system', content: systemPrompt }, ...chatHistory],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('AI gateway error', aiRes.status, errText);
      // Fall back to handoff
      await supabase.from('chat_conversations').update({ status: 'queued', ai_state: 'handed_off' }).eq('id', conversation_id);
      await supabase.from('chat_handoff_events').insert({ conversation_id, trigger_type: 'low_confidence', trigger_detail: 'AI unavailable' });
      return new Response(JSON.stringify({ ok: true, handoff: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiData = await aiRes.json();
    const reply: string = aiData.choices?.[0]?.message?.content || '';

    await supabase.from('chat_messages').insert({
      conversation_id,
      sender_type: 'ai',
      body: reply,
      sender_name: 'Assistant',
    });

    // Set ai_state to active if not already
    await supabase.from('chat_conversations').update({ ai_state: 'active' }).eq('id', conversation_id);

    // Check for handoff signal in reply
    if (reply.toLowerCase().includes('connect you with an agent') && ai.handoff_on_low_confidence) {
      await supabase.from('chat_conversations').update({ status: 'queued', ai_state: 'handed_off' }).eq('id', conversation_id);
      await supabase.from('chat_handoff_events').insert({ conversation_id, trigger_type: 'low_confidence', trigger_detail: 'AI signaled handoff' });
    }

    return new Response(JSON.stringify({ ok: true, reply }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server_error', detail: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
