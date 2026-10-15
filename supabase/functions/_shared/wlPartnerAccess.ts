// Authorization helpers for wl-* edge functions that act on a partner_id.
//
// These functions use the service-role client, so RLS does not protect them —
// every partner_id taken from a request (or derived from a row the caller named)
// must be checked here before reading or writing that partner's data.

// deno-lint-ignore no-explicit-any
type AdminClient = { from: (table: string) => any };

export async function isPlatformAdmin(admin: AdminClient, userId: string): Promise<boolean> {
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

/** Partner owner, active team member, or platform admin. */
export async function hasWLPartnerAccess(
  admin: AdminClient,
  userId: string,
  partnerId: string | null | undefined,
): Promise<boolean> {
  if (!partnerId) return false;
  const [{ data: owned }, { data: member }] = await Promise.all([
    admin.from("white_label_partners").select("id").eq("id", partnerId).eq("user_id", userId).maybeSingle(),
    admin
      .from("wl_partner_members")
      .select("id")
      .eq("partner_id", partnerId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle(),
  ]);
  if (owned || member) return true;
  return isPlatformAdmin(admin, userId);
}

export function forbiddenResponse(corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: "Forbidden" }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
