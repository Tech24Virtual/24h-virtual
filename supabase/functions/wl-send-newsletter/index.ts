import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { scope, partner_id, newsletter_draft_id, subject, html_content } = await req.json();
    if (!scope || !newsletter_draft_id || !subject || !html_content) {
      throw new Error("scope, newsletter_draft_id, subject, and html_content are required");
    }

    // Determine tables and get connection + contacts based on scope
    let api_key: string;
    let from_email: string;
    let from_name: string;
    let contacts: any[] = [];
    let sendTable: string;

    if (scope === "admin") {
      const { data: conn } = await supabaseAdmin
        .from("admin_email_connections")
        .select("*")
        .eq("status", "connected")
        .limit(1)
        .single();
      if (!conn) throw new Error("No email connection configured. Set up Resend first.");
      api_key = conn.api_key_encrypted;
      from_email = conn.from_email;
      from_name = conn.from_name;

      const { data: c } = await supabaseAdmin
        .from("admin_email_contacts")
        .select("email, name")
        .eq("subscribed", true);
      contacts = c || [];
      sendTable = "admin_email_sends";
    } else if (scope === "partner" && partner_id) {
      const { data: conn } = await supabaseAdmin
        .from("wl_email_connections")
        .select("*")
        .eq("partner_id", partner_id)
        .eq("status", "connected")
        .limit(1)
        .single();
      if (!conn) throw new Error("No email connection configured. Set up Resend first.");
      api_key = conn.api_key_encrypted;
      from_email = conn.from_email;
      from_name = conn.from_name;

      const { data: c } = await supabaseAdmin
        .from("wl_email_contacts")
        .select("email, name")
        .eq("partner_id", partner_id)
        .eq("subscribed", true);
      contacts = c || [];
      sendTable = "wl_email_sends";
    } else {
      throw new Error("Invalid scope");
    }

    if (contacts.length === 0) throw new Error("No subscribed contacts found.");

    // Send via Resend batch
    const emails = contacts.map((c) => ({
      from: `${from_name} <${from_email}>`,
      to: [c.email],
      subject,
      html: html_content,
    }));

    // Resend batch send (max 100 per batch)
    const batches = [];
    for (let i = 0; i < emails.length; i += 100) {
      batches.push(emails.slice(i, i + 100));
    }

    let totalSent = 0;
    let batchIds: string[] = [];

    for (const batch of batches) {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error("Resend send failed: " + errText);
      }

      const result = await res.json();
      totalSent += batch.length;
      if (result.data) {
        batchIds.push(...result.data.map((d: any) => d.id));
      }
    }

    // Record the send
    const sendRecord: any = {
      newsletter_draft_id,
      subject,
      recipients_count: totalSent,
      status: "sent",
      sent_at: new Date().toISOString(),
      resend_batch_id: batchIds.join(","),
    };
    if (scope === "partner") sendRecord.partner_id = partner_id;

    await supabaseAdmin.from(sendTable).insert(sendRecord);

    return new Response(JSON.stringify({ success: true, sent: totalSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("wl-send-newsletter error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
