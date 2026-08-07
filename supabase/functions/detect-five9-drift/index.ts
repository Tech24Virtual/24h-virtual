import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Five9Var { name: string; kind?: string | null; type?: string | null }

function norm(v: string | null | undefined): string {
  return (v ?? '').trim().toLowerCase();
}

function computeDrift(osMappings: any[], five9: Five9Var[]) {
  const osByName = new Map(osMappings.map((m: any) => [norm(m.five9_variable_name), m]));
  const five9ByName = new Map(five9.map((v) => [norm(v.name), v]));
  const missing_in_five9: string[] = [];
  const missing_in_os: string[] = [];
  const type_mismatches: any[] = [];
  const kind_mismatches: any[] = [];
  for (const [k, m] of osByName.entries()) if (!five9ByName.has(k)) missing_in_five9.push(m.five9_variable_name);
  for (const [k, v] of five9ByName.entries()) if (!osByName.has(k)) missing_in_os.push(v.name);
  for (const [k, m] of osByName.entries()) {
    const v = five9ByName.get(k);
    if (!v) continue;
    if (m.data_type && v.type && norm(m.data_type) !== norm(v.type)) {
      type_mismatches.push({ name: m.five9_variable_name, os_type: m.data_type, five9_type: v.type });
    }
    if (m.five9_variable_kind && v.kind && norm(m.five9_variable_kind) !== norm(v.kind)) {
      kind_mismatches.push({ name: m.five9_variable_name, os_kind: m.five9_variable_kind, five9_kind: v.kind });
    }
  }
  return {
    missing_in_five9: missing_in_five9.sort(),
    missing_in_os: missing_in_os.sort(),
    type_mismatches,
    kind_mismatches,
    total_drift: missing_in_five9.length + missing_in_os.length + type_mismatches.length + kind_mismatches.length,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin or Tech check
    const { data: roleRow } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'tech'])
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Admin or Tech role required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const clientDepartmentId = body?.client_department_id as string | undefined;
    const isLive = body?.live === true;
    const providedCampaigns = Array.isArray(body?.five9_campaigns)
      ? (body.five9_campaigns as Array<{ name: string; type: string }>)
      : undefined;

    if (!clientDepartmentId) {
      return new Response(JSON.stringify({ error: 'client_department_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // In manual mode, variables must be provided; in live mode we either use the caller-supplied
    // five9_campaigns or fall back to fetching them ourselves via the internal five9-proxy call
    if (!isLive && !providedCampaigns && !Array.isArray(body?.variables)) {
      return new Response(JSON.stringify({ error: 'variables must be an array (or pass five9_campaigns, or live:true to fetch from Five9)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Resolve Five9 variables — live API or manual paste
    let five9Vars: Five9Var[];
    let source: string;

    if (providedCampaigns) {
      // Caller (browser) already fetched campaigns from five9-proxy directly — skip the internal call
      five9Vars = providedCampaigns.map((c) => ({ name: c.name, kind: 'campaign', type: c.type }));
      source = 'live_api';
    } else if (isLive) {
      const proxyRes = await fetch(`${supabaseUrl}/functions/v1/five9-proxy?action=campaigns`, {
        headers: { apikey: anonKey },
        signal: AbortSignal.timeout(10_000),
      });
      if (!proxyRes.ok) {
        return new Response(JSON.stringify({ error: 'Failed to fetch live Five9 campaigns' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const proxyJson = await proxyRes.json();
      const campaigns = (proxyJson.data ?? []) as Array<{ name: string; type: string }>;
      five9Vars = campaigns.map((c) => ({ name: c.name, kind: 'campaign', type: c.type }));
      source = 'live_api';
    } else {
      five9Vars = (body?.variables ?? []) as Five9Var[];
      source = (body?.source ?? 'manual_paste') as string;
    }

    // Load OS mappings for this department
    const { data: osMappings, error: mapErr } = await admin
      .from('five9_variable_mappings')
      .select('five9_variable_name, five9_variable_kind, data_type, tenant_kind, wl_partner_id, wl_client_id, client_lead_id')
      .eq('client_department_id', clientDepartmentId)
      .eq('is_active', true);
    if (mapErr) throw mapErr;

    const drift = computeDrift(osMappings ?? [], five9Vars);

    const first = osMappings?.[0];
    const { data: inserted, error: insErr } = await admin
      .from('five9_drift_snapshots')
      .insert({
        tenant_kind: first?.tenant_kind ?? 'direct_24h',
        wl_partner_id: first?.wl_partner_id ?? null,
        wl_client_id: first?.wl_client_id ?? null,
        client_lead_id: first?.client_lead_id ?? null,
        client_department_id: clientDepartmentId,
        source,
        drift,
        captured_by: user.id,
      })
      .select()
      .single();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ snapshot: inserted, drift }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
