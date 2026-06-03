// Wave 2 Batch D — Campaign Runtime Bundle
// Returns the published (or admin-only draft) script tree + scenarios + faqs +
// policies for a single campaign. Designed to be consumed by the Five9 iframe.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const campaignId = url.searchParams.get("campaignId");
    const version = (url.searchParams.get("version") ?? "published").toLowerCase();

    if (!campaignId) {
      return json({ error: "campaignId is required" }, 400);
    }
    if (version !== "published" && version !== "draft") {
      return json({ error: "version must be 'published' or 'draft'" }, 400);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    // Admin check (only required for ?version=draft).
    let isAdmin = false;
    {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      isAdmin = !!roles?.some((r: { role: string }) => r.role === "admin");
    }

    if (version === "draft" && !isAdmin) {
      return json({ error: "Forbidden: draft preview is admin-only" }, 403);
    }

    // Resolve script document for the campaign (RLS will filter to allowed).
    const { data: doc, error: docErr } = await supabase
      .from("campaign_script_documents")
      .select("id, campaign_id, current_version_id, tree, status, updated_at")
      .eq("campaign_id", campaignId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (docErr) {
      return json({ error: docErr.message }, 400);
    }
    if (!doc) {
      return json({ error: "No script document for this campaign" }, 404);
    }

    // Resolve which tree to serve.
    let tree: unknown = null;
    let versionNumber: number | null = null;
    let publishedAt: string | null = null;

    if (version === "draft") {
      tree = doc.tree;
    } else {
      if (!doc.current_version_id) {
        return json(
          { error: "This campaign has no published script version yet" },
          409,
        );
      }
      const { data: ver, error: vErr } = await supabase
        .from("campaign_script_document_versions")
        .select("version_number, tree, published_at")
        .eq("id", doc.current_version_id)
        .maybeSingle();
      if (vErr || !ver) {
        return json({ error: vErr?.message ?? "Version not found" }, 404);
      }
      tree = ver.tree;
      versionNumber = ver.version_number;
      publishedAt = ver.published_at;
    }

    // Companion data (filtered by RLS automatically).
    const [scenariosRes, faqsRes, policiesRes] = await Promise.all([
      supabase
        .from("campaign_scenarios")
        .select("id, title, trigger_md, expected_outcome_md, disposition, routing, tags, sort_order, status")
        .eq("campaign_id", campaignId)
        .neq("status", "archived")
        .order("sort_order", { ascending: true }),
      supabase
        .from("campaign_faq_entries")
        .select("id, question, answer_md, tags, status")
        .eq("status", "published")
        .limit(500),
      supabase
        .from("campaign_policy_blocks")
        .select("id, title, body_md, policy_kind, tags, status")
        .eq("status", "published")
        .limit(500),
    ]);

    return json({
      campaignId,
      documentId: doc.id,
      version,
      versionNumber,
      publishedAt,
      tree,
      scenarios: scenariosRes.data ?? [],
      faqs: faqsRes.data ?? [],
      policies: policiesRes.data ?? [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return json({ error: message }, 500);
  }
});
