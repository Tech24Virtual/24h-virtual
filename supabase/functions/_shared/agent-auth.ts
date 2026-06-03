import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export { corsHeaders };

/**
 * Validates the caller's JWT and checks they have one of the allowed roles.
 * Returns the authenticated user or a 401/403 Response.
 */
export async function authenticateAgent(
  req: Request,
  allowedRoles: string[]
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
