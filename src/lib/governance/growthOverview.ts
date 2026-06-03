/**
 * Phase 2 — Growth governance read wrapper.
 *
 * Single typed surface for fetching Growth KPIs from the canonical
 * v_growth_overview view. Future SuperAdmin/Mission Control panels
 * should consume this — never query disc_* / blog_posts / keyword_tracker
 * directly for KPIs.
 */
import { supabase } from "@/integrations/supabase/client";

export interface GrowthOverview {
  disc_pages_total: number;
  disc_pages_published: number;
  disc_pages_draft: number;
  disc_pages_ready_to_publish: number;
  disc_pages_needs_rewrite: number;
  disc_templates_active: number;
  disc_keywords_active: number;
  disc_locations_active: number;
  disc_audiences_active: number;
  blog_posts_published: number;
  blog_posts_draft: number;
  blog_posts_total: number;
  keywords_tracked: number;
}

export async function fetchGrowthOverview(): Promise<GrowthOverview | null> {
  const { data, error } = await supabase
    .from("v_growth_overview" as any)
    .select("*")
    .maybeSingle();
  if (error) {
    console.error("fetchGrowthOverview", error);
    return null;
  }
  return ((data as unknown) as GrowthOverview | null) ?? null;
}

/**
 * Admin-only RPC wrapper for promoting a Discoverability page through
 * approve → publish / unpublish / rewrite. Backed by publish_disc_page().
 */
export async function publishDiscPage(
  pageId: string,
  action: "approve" | "request_rewrite" | "publish" | "unpublish",
  notes?: string,
) {
  const { data, error } = await supabase.rpc("publish_disc_page" as any, {
    _page_id: pageId,
    _action: action,
    _notes: notes ?? null,
  });
  return { data, error };
}
