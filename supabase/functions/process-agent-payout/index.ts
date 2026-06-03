import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getAirwallexCredentials(adminClient: any): Promise<{ clientId: string; apiKey: string; baseUrl: string }> {
  const { data, error } = await adminClient
    .from("admin_settings")
    .select("key, value")
    .in("key", ["airwallex_client_id", "airwallex_api_key", "airwallex_env"]);

  if (error) throw new Error("Failed to fetch Airwallex settings");

  const settings: Record<string, string> = {};
  (data || []).forEach((row: any) => {
    // Values are stored JSON-stringified
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  });

  const clientId = settings.airwallex_client_id || "";
  const apiKey = settings.airwallex_api_key || "";
  if (!clientId || !apiKey) {
    throw new Error("Airwallex API credentials not configured. Go to Admin Settings → Integrations to add them.");
  }

  const env = settings.airwallex_env || "demo";
  const baseUrl = env === "production"
    ? "https://api.airwallex.com"
    : "https://api-demo.airwallex.com";

  return { clientId, apiKey, baseUrl };
}

async function getAirwallexToken(clientId: string, apiKey: string, baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/v1/authentication/login`, {
    method: "POST",
    headers: {
      "x-client-id": clientId,
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airwallex auth failed: ${res.status} ${body}`);
  }
  const data = await res.json();
  return data.token;
}

async function createBeneficiary(
  token: string,
  banking: any,
  baseUrl: string
): Promise<string> {
  const bankDetails: any = {
    account_name: banking.account_holder_name,
    account_number: banking.account_number_encrypted,
    bank_name: banking.bank_name,
    account_routing_type1:
      banking.country === "CA" ? "institution_number" : "aba",
    account_routing_value1:
      banking.country === "CA"
        ? banking.institution_number
        : banking.routing_number,
  };

  if (banking.country === "CA" && banking.transit_number) {
    bankDetails.account_routing_type2 = "branch_number";
    bankDetails.account_routing_value2 = banking.transit_number;
  }

  if (banking.swift_bic) {
    bankDetails.swift_code = banking.swift_bic;
  }

  const body = {
    beneficiary: {
      bank_details: bankDetails,
      entity_type: "PERSONAL",
      address: {
        country_code: banking.country || "CA",
      },
    },
    nickname: banking.account_holder_name || "Agent",
  };

  const res = await fetch(`${baseUrl}/api/v1/beneficiaries/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to create beneficiary: ${res.status} ${errorBody}`);
  }

  const data = await res.json();
  return data.beneficiary_id || data.id;
}

async function createTransfer(
  token: string,
  beneficiaryId: string,
  amount: number,
  currency: string,
  invoiceId: string,
  baseUrl: string
): Promise<string> {
  const requestId = crypto.randomUUID();

  const res = await fetch(`${baseUrl}/api/v1/transfers/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      beneficiary_id: beneficiaryId,
      transfer_amount: amount.toFixed(2),
      transfer_currency: currency,
      source_currency: currency,
      reason: "payroll",
      reference: `shift-invoice-${invoiceId}`,
      request_id: requestId,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Transfer failed: ${res.status} ${errorBody}`);
  }

  const data = await res.json();
  return data.transfer_id || data.id || requestId;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    // Create user client to check role
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const userRoles = (roles || []).map((r: any) => r.role);
    if (!userRoles.includes("admin") && !userRoles.includes("billing")) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { invoice_ids } = await req.json();
    if (!Array.isArray(invoice_ids) || invoice_ids.length === 0) {
      return new Response(JSON.stringify({ error: "invoice_ids required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Airwallex credentials from admin_settings and authenticate
    let airwallexToken: string;
    let airwallexBaseUrl: string;
    try {
      const creds = await getAirwallexCredentials(adminClient);
      airwallexBaseUrl = creds.baseUrl;
      airwallexToken = await getAirwallexToken(creds.clientId, creds.apiKey, creds.baseUrl);
    } catch (e: any) {
      return new Response(
        JSON.stringify({ error: `Airwallex authentication failed: ${e.message}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: any[] = [];

    for (const invoiceId of invoice_ids) {
      try {
        // Fetch invoice
        const { data: invoice, error: invErr } = await adminClient
          .from("shift_invoices")
          .select("*")
          .eq("id", invoiceId)
          .eq("status", "supervisor_approved")
          .single();

        if (invErr || !invoice) {
          results.push({ invoice_id: invoiceId, success: false, error: "Invoice not found or not approved" });
          continue;
        }

        // Fetch banking
        const { data: banking, error: bankErr } = await adminClient
          .from("agent_banking")
          .select("*")
          .eq("agent_id", invoice.agent_id)
          .single();

        if (bankErr || !banking) {
          results.push({ invoice_id: invoiceId, success: false, error: "No banking details on file" });
          continue;
        }

        if (!banking.hourly_rate) {
          results.push({ invoice_id: invoiceId, success: false, error: "No hourly rate set" });
          continue;
        }

        const payoutAmount = Math.round(invoice.net_hours * banking.hourly_rate * 100) / 100;
        const currency = banking.currency || "CAD";

        // Ensure beneficiary exists
        let beneficiaryId = banking.airwallex_beneficiary_id;
        if (!beneficiaryId) {
          beneficiaryId = await createBeneficiary(airwallexToken, banking, airwallexBaseUrl);
          // Store beneficiary ID
          await adminClient
            .from("agent_banking")
            .update({ airwallex_beneficiary_id: beneficiaryId })
            .eq("agent_id", invoice.agent_id);
        }

        // Create transfer
        const transferId = await createTransfer(
          airwallexToken,
          beneficiaryId,
          payoutAmount,
          currency,
          invoiceId,
          airwallexBaseUrl
        );

        // Update invoice
        await adminClient
          .from("shift_invoices")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            payout_amount: payoutAmount,
            airwallex_transfer_id: transferId,
          })
          .eq("id", invoiceId);

        results.push({ invoice_id: invoiceId, success: true, amount: payoutAmount, transfer_id: transferId });
      } catch (e: any) {
        results.push({ invoice_id: invoiceId, success: false, error: e.message });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
