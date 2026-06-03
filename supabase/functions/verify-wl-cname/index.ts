import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { partnerId, aliasId } = await req.json();
    if (!partnerId) {
      return new Response(JSON.stringify({ error: "partnerId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let domain: string | null = null;
    let table: "white_label_branding" | "white_label_domain_aliases";
    let rowId: string | null = null;
    let matchCol: "partner_id" | "id";

    if (aliasId) {
      const { data: alias, error } = await supabase
        .from("white_label_domain_aliases")
        .select("id, alias_hostname, partner_id")
        .eq("id", aliasId)
        .single();
      if (error || !alias) {
        return new Response(JSON.stringify({ error: "Alias not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (alias.partner_id !== partnerId) {
        return new Response(JSON.stringify({ error: "Alias does not belong to partner" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      domain = alias.alias_hostname;
      table = "white_label_domain_aliases";
      rowId = alias.id;
      matchCol = "id";
    } else {
      const { data: branding, error } = await supabase
        .from("white_label_branding")
        .select("custom_domain, cname_status")
        .eq("partner_id", partnerId)
        .single();
      if (error || !branding) {
        return new Response(JSON.stringify({ error: "Branding not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!branding.custom_domain) {
        return new Response(JSON.stringify({ error: "No custom domain configured" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      domain = branding.custom_domain;
      table = "white_label_branding";
      matchCol = "partner_id";
      rowId = partnerId;
    }

    const expectedCnameTarget = "virtual-rep.lovable.app";
    const expectedATarget = "185.158.133.1";

    const checkedAt = new Date().toISOString();

    // Mark verifying + record check timestamp
    await supabase
      .from(table)
      .update({ cname_status: "verifying", cname_last_checked_at: checkedAt })
      .eq(matchCol, rowId);

    let verified = false;
    try {
      // Try CNAME first
      try {
        const cnames = await Deno.resolveDns(domain!, "CNAME");
        verified = cnames.some(
          (r: string) =>
            r === expectedCnameTarget ||
            r === `${expectedCnameTarget}.` ||
            r.toLowerCase().includes(expectedCnameTarget.toLowerCase()),
        );
      } catch {
        // No CNAME — try A record (apex)
        try {
          const aRecords = await Deno.resolveDns(domain!, "A");
          verified = aRecords.includes(expectedATarget);
        } catch (e) {
          console.error("DNS A lookup failed:", e);
        }
      }
    } catch (dnsErr) {
      console.error("DNS lookup failed:", dnsErr);
    }

    const newStatus = verified ? "active" : "failed";
    const updateData: Record<string, unknown> = {
      cname_status: newStatus,
      cname_last_checked_at: checkedAt,
    };
    if (verified) updateData.cname_verified_at = checkedAt;

    await supabase.from(table).update(updateData).eq(matchCol, rowId);

    return new Response(
      JSON.stringify({
        status: newStatus,
        domain,
        expectedTarget: expectedCnameTarget,
        verified,
        lastCheckedAt: checkedAt,
        scope: aliasId ? "alias" : "canonical",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
