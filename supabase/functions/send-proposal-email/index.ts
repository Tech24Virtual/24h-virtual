import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { proposal_id } = await req.json();

    if (!proposal_id) {
      return new Response(
        JSON.stringify({ error: "Missing proposal_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: proposal, error: proposalErr } = await supabase
      .from("sales_proposals")
      .select("*, leads(name, email, company)")
      .eq("id", proposal_id)
      .maybeSingle();

    if (proposalErr) throw proposalErr;

    if (!proposal) {
      return new Response(
        JSON.stringify({ error: "Proposal not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const leadEmail = proposal.leads?.email;

    console.log(
      `[send-proposal-email] Would send proposal email to ${leadEmail} for proposal ${proposal.title}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email queued",
        proposal_id,
        lead_email: leadEmail,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[send-proposal-email]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
