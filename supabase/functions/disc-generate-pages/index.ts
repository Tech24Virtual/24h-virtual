import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { fetchRefs, pickFaqs, pickLinks, renderPage } from "../_shared/discEngine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  templateIds: string[];
  locationIds: string[];
  keywordIds: string[];
  audienceIds?: string[];
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
    const userId = claims.claims.sub;

    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = (await req.json()) as Body;
    if (!Array.isArray(body.templateIds) || body.templateIds.length === 0) {
      return new Response(JSON.stringify({ error: "templateIds required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const refs = await fetchRefs(admin, {
      templateIds: body.templateIds,
      locationIds: body.locationIds ?? [],
      keywordIds: body.keywordIds ?? [],
      audienceIds: body.audienceIds ?? [],
    });

    let created = 0;
    let skipped = 0;
    const errors: { combo: string; error: string }[] = [];

    // Build the combination matrix. If a dimension is empty, use [null].
    const tIds = body.templateIds;
    const lIds = (body.locationIds && body.locationIds.length > 0) ? body.locationIds : [null];
    const kIds = (body.keywordIds && body.keywordIds.length > 0) ? body.keywordIds : [null];
    const aIds = (body.audienceIds && body.audienceIds.length > 0) ? body.audienceIds : [null];

    for (const tId of tIds) {
      const template = refs.templates[tId];
      if (!template) { errors.push({ combo: tId, error: "template not found" }); continue; }

      for (const lId of lIds) {
        const location = lId ? refs.locations[lId] : null;
        for (const kId of kIds) {
          const keyword = kId ? refs.keywords[kId] : null;
          for (const aId of aIds) {
            const audience = aId ? refs.audiences[aId] : null;

            const faqs = pickFaqs(refs, keyword);
            const links = pickLinks(refs, keyword);

            try {
              const rendered = await renderPage({ template, location, keyword, audience, faqs, links });

              const insert = {
                page_type: rendered.page_type,
                slug: rendered.slug,
                full_url: rendered.full_url,
                template_id: template.id,
                location_id: location?.id ?? null,
                keyword_id: keyword?.id ?? null,
                audience_id: audience?.id ?? null,
                faq_set_id: keyword?.default_faq_set_id ?? null,
                page_title: rendered.page_title,
                meta_title: rendered.meta_title,
                meta_description: rendered.meta_description,
                og_title: rendered.og_title,
                og_description: rendered.og_description,
                h1: rendered.h1,
                breadcrumb_title: rendered.breadcrumb_title,
                hero_content: rendered.hero_content,
                direct_answer_content: rendered.direct_answer_content,
                local_overview_content: rendered.local_overview_content,
                problem_section_content: rendered.problem_section_content,
                solution_section_content: rendered.solution_section_content,
                feature_section_content: rendered.feature_section_content,
                faq_content: rendered.faq_content,
                internal_links_payload: rendered.internal_links_payload,
                schema_payload: rendered.schema_payload,
                word_count: rendered.word_count,
                quality_score: rendered.quality_score,
                readiness_state: rendered.readiness_state,
                publish_status: "draft",
                include_in_sitemap: false,
                indexation_status: "noindex",
                source_combination_hash: rendered.source_combination_hash,
                manual_override: false,
                duplicate_warning_score: 0,
              };

              const { error: insErr } = await admin
                .from("disc_generated_pages")
                .insert(insert);

              if (insErr) {
                if (insErr.code === "23505") {
                  skipped += 1;
                } else {
                  errors.push({ combo: rendered.source_combination_hash, error: insErr.message });
                }
              } else {
                created += 1;
              }
            } catch (e) {
              errors.push({ combo: `${template.id}|${location?.id ?? ""}|${keyword?.id ?? ""}|${audience?.id ?? ""}`, error: String(e) });
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ created, skipped, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
