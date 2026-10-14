import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export { corsHeaders };

/**
 * True if the token is a genuine service-role key. Matches the function's own
 * SUPABASE_SERVICE_ROLE_KEY, or — since pg_cron jobs may hold the legacy JWT
 * service-role key, which differs from the env value — a JWT whose role claim
 * is service_role AND that the auth admin API accepts (only a real service-role
 * key can call it, so the unverified claim is never trusted on its own).
 */
async function isServiceRoleToken(token: string): Promise<boolean> {
  const envKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (envKey && token === envKey) return true;

  // Cheap claim pre-check so ordinary user JWTs skip the admin call.
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "=")));
    if (payload.role !== "service_role") return false;
  } catch {
    return false;
  }

  const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, token, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 });
  return !error;
}

/**
 * Validates the caller's JWT and checks they have one of the allowed roles.
 * Returns the authenticated user or a 401/403 Response.
 *
 * allowServiceRole: accept the service-role key as a scheduler (pg_cron) call,
 * returning user { id: "scheduler", roles: ["service_role"] }. Opt-in per
 * function — most callers (payments, payroll) must stay user-only.
 */
export async function authenticateAgent(
  req: Request,
  allowedRoles: string[],
  options: { allowServiceRole?: boolean } = {}
): Promise<{ user: any; error?: never } | { user?: never; error: Response }> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      error: new Response(
        JSON.stringify({ error: "Unauthorized: missing token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ),
    };
  }

  if (options.allowServiceRole && await isServiceRoleToken(authHeader.slice("Bearer ".length))) {
    return { user: { id: "scheduler", roles: ["service_role"] } };
  }

  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await anonClient.auth.getUser(token);
  if (error || !user) {
    return {
      error: new Response(
        JSON.stringify({ error: "Unauthorized: invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ),
    };
  }

  const userId = user.id;

  // Check roles using service role client
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: roles } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const userRoles = (roles || []).map((r: any) => r.role);
  const hasAllowedRole = allowedRoles.some((r) => userRoles.includes(r));

  if (!hasAllowedRole) {
    return {
      error: new Response(
        JSON.stringify({ error: "Forbidden: insufficient role" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ),
    };
  }

  return { user: { id: userId, roles: userRoles } };
}

/**
 * Checks platform_settings.force_simulation_mode and returns the effective mode
 * along with a flag indicating whether the global override was applied.
 */
export async function getEffectiveMode(
  supabase: any,
  configMode: string
): Promise<{ mode: string; wasOverridden: boolean }> {
  const { data: settings } = await supabase
    .from("platform_settings")
    .select("force_simulation_mode")
    .limit(1)
    .single();

  if (settings?.force_simulation_mode) {
    return { mode: "simulation", wasOverridden: true };
  }
  return { mode: configMode || "simulation", wasOverridden: false };
}
