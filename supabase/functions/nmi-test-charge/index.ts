import { corsHeaders, authenticateAgent } from "../_shared/agent-auth.ts";
import { NMI_API_URL, parseNmiResponse, deriveCardType } from "../_shared/nmi.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateAgent(req, ["admin"]);
    if (auth.error) return auth.error;

    const nmiMode = Deno.env.get("NMI_MODE");
    if (nmiMode !== "test") {
      return new Response(
        JSON.stringify({ error: "This endpoint only works in sandbox mode (NMI_MODE=test)" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nmiKey = Deno.env.get("NMI_API_KEY");
    if (!nmiKey) throw new Error("NMI_API_KEY is not configured");

    const { card_number, card_expiry, card_cvv, amount, first_name, last_name } =
      await req.json();

    if (!card_number || !card_expiry || !card_cvv || !amount) {
      return new Response(
        JSON.stringify({ error: "card_number, card_expiry, card_cvv, and amount are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanCard = String(card_number).replace(/\D/g, "");

    const params = new URLSearchParams({
      security_key: nmiKey,
      type: "sale",
      ccnumber: cleanCard,
      ccexp: String(card_expiry).replace(/\D/g, ""),
      cvv: String(card_cvv),
      amount: Number(amount).toFixed(2),
      first_name: first_name || "",
      last_name: last_name || "",
    });

    const nmiRes = await fetch(NMI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const nmiData = parseNmiResponse(await nmiRes.text());

    return new Response(
      JSON.stringify({
        success: nmiData.response === "1",
        transaction_id: nmiData.transactionid || null,
        response_text:
          nmiData.responsetext || (nmiData.response === "1" ? "Approved" : "Declined"),
        card_type: deriveCardType(cleanCard),
        card_last_four: cleanCard.slice(-4),
        response_code: nmiData.response_code || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
