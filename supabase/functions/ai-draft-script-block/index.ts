// AI script block drafting via Lovable AI Gateway.
// Admin-only. Rate-limited to 30 requests/hour/user via ai_draft_log.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `You draft call-center script blocks for a virtual receptionist platform. Return JSON ONLY in this shape:
{"title": "string (<=80 chars)", "body_md": "markdown body", "suggested_branches": [{"label": "string", "reason": "string"}]}
Tone: clear, polite, agent-friendly. Keep body under 250 words. Suggest 0-3 branches max.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) throw new Error('LOVABLE_API_KEY not configured');

    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;

    // admin-only
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // rate limit: 30 / hour
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from('ai_draft_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since);
    if ((count ?? 0) >= 30) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded (30/hour). Try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { prompt, campaign_id, context_md } = body ?? {};
    if (typeof prompt !== 'string' || prompt.trim().length < 4) {
      return new Response(JSON.stringify({ error: 'prompt is required (min 4 chars)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // call Lovable AI
    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content:
              (context_md ? `Context:\n${context_md}\n\n` : '') +
              `Draft request:\n${prompt}`,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'emit_script_block',
              description: 'Return the drafted script block.',
              parameters: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  body_md: { type: 'string' },
                  suggested_branches: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        label: { type: 'string' },
                        reason: { type: 'string' },
                      },
                      required: ['label', 'reason'],
                    },
                  },
                },
                required: ['title', 'body_md', 'suggested_branches'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'emit_script_block' } },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: 'Lovable AI rate limit. Try again shortly.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (aiResp.status === 402) {
      return new Response(
        JSON.stringify({ error: 'Lovable AI credits exhausted. Add funds in Settings > Workspace > Usage.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error('AI gateway error', aiResp.status, t);
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: any = null;
    try {
      parsed = JSON.parse(toolCall?.function?.arguments ?? '{}');
    } catch {
      parsed = null;
    }
    if (!parsed || typeof parsed.title !== 'string' || typeof parsed.body_md !== 'string') {
      return new Response(JSON.stringify({ error: 'AI returned malformed output' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // log
    await admin.from('ai_draft_log').insert({
      user_id: userId,
      campaign_id: campaign_id ?? null,
      prompt,
      model: 'google/gemini-2.5-flash',
      response: parsed,
      status: 'ok',
    });

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('ai-draft-script-block error', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
