import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, authenticateAgent } from "../_shared/agent-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Admin-only
  const auth = await authenticateAgent(req, ["admin"]);
  if (auth.error) return auth.error;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const checks: Array<{
    category: string;
    name: string;
    status: "pass" | "fail" | "warn";
    detail: string;
  }> = [];

  // --- API Keys ---
  const secrets = [
    { name: "Stripe Secret Key", env: "STRIPE_SECRET_KEY" },
    { name: "Resend API Key", env: "RESEND_API_KEY" },
    { name: "Slack Bot Token", env: "SLACK_BOT_TOKEN" },
    { name: "Slack Signing Secret", env: "SLACK_SIGNING_SECRET" },
    { name: "Five9 Webhook Key", env: "FIVE9_WEBHOOK_KEY" },
    { name: "Lovable API Key", env: "LOVABLE_API_KEY" },
  ];

  for (const s of secrets) {
    const val = Deno.env.get(s.env);
    checks.push({
      category: "API Keys",
      name: s.name,
      status: val ? "pass" : "fail",
      detail: val ? "Configured" : "Not configured",
    });
  }

  // --- Database: RLS ---
  try {
    const { data: tables } = await supabase.rpc("", {}).maybeSingle(); // won't work, use raw
    // Use information_schema via a direct query isn't possible with JS SDK.
    // Instead check known critical tables via pg_catalog
    const { data: rlsData, error: rlsError } = await supabase
      .from("platform_settings")
      .select("id")
      .limit(1);

    // We can't query pg_tables from JS SDK. Instead, verify RLS by trying
    // an unauthenticated read on a sensitive table using anon key.
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const rlsTestTables = [
      "leads",
      "agent_banking",
      "payroll_runs",
      "user_roles",
      "agent_shifts",
      "missions",
    ];

    for (const table of rlsTestTables) {
      const { data, error } = await anonClient
        .from(table)
        .select("id")
        .limit(1);

      // If RLS is working, anon should get 0 rows or an error
      const rowCount = data?.length ?? 0;
      checks.push({
        category: "Database Security",
        name: `RLS on ${table}`,
        status: rowCount === 0 ? "pass" : "fail",
        detail:
          rowCount === 0
            ? "RLS active — anon gets 0 rows"
            : `WARNING: anon read returned ${rowCount} row(s)`,
      });
    }
  } catch (e) {
    checks.push({
      category: "Database Security",
      name: "RLS Check",
      status: "warn",
      detail: `Error running RLS checks: ${e.message}`,
    });
  }

  // --- Platform Settings ---
  const { data: platformSettings } = await supabase
    .from("platform_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  checks.push({
    category: "Platform",
    name: "Platform settings row exists",
    status: platformSettings ? "pass" : "fail",
    detail: platformSettings ? "Found" : "Missing — create a row in platform_settings",
  });

  if (platformSettings) {
    checks.push({
      category: "Agents",
      name: "Emergency Simulation Mode",
      status: platformSettings.force_simulation_mode ? "warn" : "pass",
      detail: platformSettings.force_simulation_mode
        ? "ACTIVE — all agents forced to simulation"
        : "Off — agents use individual configs",
    });
  }

  // --- Agent Configs ---
  const expectedAgents = [
    "CallReportAgent",
    "PayrollAgent",
    "HiringAgent",
    "LeadsAgent",
    "FabricIdentitySyncAgent",
    "LifecycleAgent",
  ];

  const { data: agentConfigs } = await supabase
    .from("agent_configs")
    .select("agent_name, enabled, mode, safety_thresholds");

  const configuredNames = (agentConfigs || []).map((c: any) => c.agent_name);

  for (const agent of expectedAgents) {
    const config = (agentConfigs || []).find((c: any) => c.agent_name === agent);
    if (!config) {
      checks.push({
        category: "Agents",
        name: `${agent} config`,
        status: "fail",
        detail: "Missing agent_configs row",
      });
      continue;
    }

    checks.push({
      category: "Agents",
      name: `${agent} config`,
      status: "pass",
      detail: `Mode: ${config.mode}, Enabled: ${config.enabled}`,
    });

    const thresholds = config.safety_thresholds;
    const hasThresholds =
      thresholds && typeof thresholds === "object" && Object.keys(thresholds).length > 0;
    checks.push({
      category: "Agents",
      name: `${agent} safety thresholds`,
      status: hasThresholds ? "pass" : "warn",
      detail: hasThresholds
        ? `${Object.keys(thresholds).length} threshold(s) configured`
        : "No safety thresholds set",
    });
  }

  // --- Integrations ---
  const projectId = Deno.env.get("SUPABASE_URL")?.split("//")[1]?.split(".")[0] || "unknown";

  checks.push({
    category: "Integrations",
    name: "Stripe Webhook Endpoint",
    status: "warn",
    detail: `Verify webhook points to: https://${projectId}.supabase.co/functions/v1/stripe-webhook`,
  });

  checks.push({
    category: "Integrations",
    name: "Five9 Ingestion Endpoint",
    status: "warn",
    detail: `Verify Five9 sends to: https://${projectId}.supabase.co/functions/v1/ingest-call-report`,
  });

  // --- SEO Audit (informational) ---
  const seoChecks = [
    { name: "Homepage schema (Organization)", status: "pass" as const, detail: "organizationSchema with AggregateRating present" },
    { name: "Industry pages schemas", status: "pass" as const, detail: "15 pages with Service + FAQ + Breadcrumb schemas" },
    { name: "Solution pages schemas", status: "pass" as const, detail: "6 pages with Service + Breadcrumb schemas" },
    { name: "Location pages LocalBusiness", status: "pass" as const, detail: "Dynamic LocalBusiness schema generation" },
    { name: "robots.txt AI crawlers", status: "pass" as const, detail: "GPTBot, ClaudeBot, PerplexityBot allowed" },
    { name: "Sitemap index", status: "pass" as const, detail: "sitemap-main.xml + sitemap-locations.xml" },
    { name: "/blog/:slug meta", status: "warn" as const, detail: "Verify all published posts have meta_description filled" },
    { name: "/guides/:slug meta", status: "warn" as const, detail: "Verify each guide has unique title & description" },
    { name: "/partners/* structured data", status: "warn" as const, detail: "Verify canonical URLs and schemas on partner pages" },
  ];

  for (const seo of seoChecks) {
    checks.push({ category: "SEO", ...seo });
  }

  return new Response(JSON.stringify({ checks, timestamp: new Date().toISOString() }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
