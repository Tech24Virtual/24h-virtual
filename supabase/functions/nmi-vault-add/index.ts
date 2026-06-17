import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, authenticateAgent } from "../_shared/agent-auth.ts";
import { NMI_API_URL, parseNmiResponse, deriveCardType } from "../_shared/nmi.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateAgent(req, ["admin", "billing", "client"]);
    if (auth.error) return auth.error;

    const nmiKey = Deno.env.get("NMI_API_KEY");
    if (!nmiKey) throw new Error("NMI_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const {
      lead_id,
      card_number,
      card_expiry,
      card_cvv,
      first_name,
      last_name,
      billing_address,
      billing_city,
      billing_state,
      billing_zip,
      billing_country,
    } = await req.json();

    if (!lead_id || !card_number || !card_expiry || !card_cvv) {
      return new Response(
        JSON.stringify({ error: "lead_id, card_number, card_expiry, and card_cvv are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("id, name, user_id")
      .eq("id", lead_id)
      .single();

    if (leadErr || !lead) {
      return new Response(
        JSON.stringify({ error: "Lead not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clients may only add a card to their own lead
    const isClientOnly = auth.user.roles.includes("client") &&
      !auth.user.roles.includes("admin") &&
      !auth.user.roles.includes("billing");
    if (isClientOnly && lead.user_id !== auth.user.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: not your account" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const params = new URLSearchParams({
      security_key: nmiKey,
      customer_vault: "add_customer",
      first_name: first_name || "",
      last_name: last_name || "",
      ccnumber: card_number,
      ccexp: card_expiry.replace(/\D/g, ""),
      cvv: card_cvv,
      address1: billing_address || "",
      city: billing_city || "",
      state: billing_state || "",
      zip: billing_zip || "",
      country: billing_country || "US",
    });

    const nmiRes = await fetch(NMI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const nmiData = parseNmiResponse(await nmiRes.text());

    if (nmiData.response !== "1") {
      return new Response(
        JSON.stringify({
          success: false,
          message: nmiData.responsetext || "Card declined or error",
          response_code: nmiData.response_code,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lastFour = card_number.slice(-4);
    const cardType = deriveCardType(card_number);

    const { error: updateErr } = await supabase
      .from("leads")
      .update({
        payment_processor: "nmi",
        nmi_customer_vault_id: nmiData.customer_vault_id,
        nmi_card_last_four: lastFour,
        nmi_card_type: cardType,
        nmi_card_expiry: card_expiry,
        payment_method_on_file: true,
      })
      .eq("id", lead_id);

    if (updateErr) throw new Error(`Failed to update lead: ${updateErr.message}`);

    return new Response(
      JSON.stringify({
        success: true,
        customer_vault_id: nmiData.customer_vault_id,
        card_last_four: lastFour,
        card_type: cardType,
        message: "Card added to vault successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
