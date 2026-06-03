import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'no_auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { conversation_id, body: messageBody } = await req.json();
    if (!conversation_id || !messageBody || typeof messageBody !== 'string' || messageBody.length > 4000) {
      return new Response(JSON.stringify({ error: 'invalid_payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Use service role to insert (bypasses RLS but we verified the user identity)
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Verify the user is the assigned agent (or admin/supervisor)
    const { data: convo } = await supabase
      .from('chat_conversations')
      .select('id, assigned_agent_id, status')
      .eq('id', conversation_id)
      .maybeSingle();

    if (!convo) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const roleList = (roles || []).map((r: any) => r.role);
    const canSend = convo.assigned_agent_id === user.id || roleList.includes('admin') || roleList.includes('supervisor');

    if (!canSend) return new Response(JSON.stringify({ error: 'not_assigned' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();

    await supabase.from('chat_messages').insert({
      conversation_id,
      sender_type: 'agent',
      sender_id: user.id,
      sender_name: profile?.full_name || 'Agent',
      body: messageBody.trim(),
    });

    // Reset agent unread, mark active if queued
    const updates: any = { unread_agent_count: 0 };
    if (convo.status === 'queued' || convo.status === 'new') updates.status = 'active';
    await supabase.from('chat_conversations').update(updates).eq('id', conversation_id);

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server_error', detail: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
