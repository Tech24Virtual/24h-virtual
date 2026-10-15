import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves the white-label partner the user acts for: the partner they own
 * (white_label_partners.user_id) first, then an active wl_partner_members row.
 * Mirrors the DB helper public.is_wl_partner_member() used by RLS.
 */
export async function resolveWLPartnerId(userId: string): Promise<string | null> {
  const { data: owned } = await supabase
    .from("white_label_partners")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (owned) return owned.id;

  const { data: memberRow } = await supabase
    .from("wl_partner_members")
    .select("partner_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return memberRow?.partner_id ?? null;
}

/**
 * Drop-in replacement for
 *   supabase.from("white_label_partners").select(cols).eq("user_id", userId).maybeSingle()
 * that also works for team members.
 */
export async function fetchMyWLPartner(userId: string, columns = "id") {
  const partnerId = await resolveWLPartnerId(userId);
  if (!partnerId) return { data: null, error: null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase.from("white_label_partners").select(columns as any).eq("id", partnerId).maybeSingle();
}
