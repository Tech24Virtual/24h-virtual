import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { fetchRefs, pickFaqs, pickLinks, renderPage } from "../_shared/discEngine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  templateId: string;
  locationId?: string | null;
  keywordId?: string | null;
  audienceId?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await userClient.auth.getClaims(token);
    if (cErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: claims.claims.sub, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = (await req.json()) as Body;
    if (!body.templateId) {
      return new Response(JSON.stringify({ error: "templateId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const refs = await fetchRefs(admin, {
      templateIds: [body.templateId],
      locationIds: body.locationId ? [body.locationId] : [],
      keywordIds: body.keywordId ? [body.keywordId] : [],
      audienceIds: body.audienceId ? [body.audienceId] : [],
    });

    const template = refs.templates[body.templateId];
    if (!template) {
      return new Response(JSON.stringify({ error: "template not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const location = body.locationId ? refs.locations[body.locationId] : null;
    const keyword = body.keywordId ? refs.keywords[body.keywordId] : null;
    const audience = body.audienceId ? refs.audiences[body.audienceId] : null;

    const faqs = pickFaqs(refs, keyword);
    const links = pickLinks(refs, keyword);
    const rendered = await renderPage({ template, location, keyword, audience, faqs, links });

    return new Response(JSON.stringify({ rendered }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
