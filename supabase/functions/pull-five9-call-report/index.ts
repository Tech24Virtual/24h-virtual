import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, authenticateAgent } from "../_shared/agent-auth.ts";

const FIVE9_USERNAME = Deno.env.get("FIVE9_USERNAME") ?? "";
const FIVE9_PASSWORD = Deno.env.get("FIVE9_PASSWORD") ?? "";
const REPORTING_URL = "https://api.five9.com/wsreports/v12/ReportingService";

function basicAuth() {
  return btoa(`${FIVE9_USERNAME}:${FIVE9_PASSWORD}`);
}

async function soapReportRequest(body: string, action: string): Promise<string> {
  const res = await fetch(REPORTING_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml;charset=UTF-8",
      "Authorization": `Basic ${basicAuth()}`,
      "SOAPAction": `http://service.reports.ws.five9.com/${action}`,
      "Accept": "text/xml",
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Five9 Reporting error ${res.status}: ${text.substring(0, 300)}`);
  return text;
}

async function runReport(folderName: string, reportName: string, startDate: string, endDate: string): Promise<string> {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.reports.ws.five9.com/">
  <soapenv:Body>
    <ser:runReport>
      <folderName>${folderName}</folderName>
      <reportName>${reportName}</reportName>
      <criteria>
        <time>
          <start>${startDate}T00:00:00.000</start>
          <end>${endDate}T23:59:59.000</end>
        </time>
      </criteria>
    </ser:runReport>
  </soapenv:Body>
</soapenv:Envelope>`;
  const response = await soapReportRequest(xml, "runReport");
  const match = response.match(/<return[^>]*>(\d+)<\/return>/);
  if (!match) throw new Error(`Could not parse report identifier: ${response.substring(0, 300)}`);
  return match[1];
}

async function pollUntilReady(identifier: string, maxAttempts = 10): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, 3000));
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.reports.ws.five9.com/">
  <soapenv:Body>
    <ser:isReportRunning>
      <identifier>${identifier}</identifier>
    </ser:isReportRunning>
  </soapenv:Body>
</soapenv:Envelope>`;
    const response = await soapReportRequest(xml, "isReportRunning");
    const match = response.match(/<return[^>]*>(true|false)<\/return>/i);
    const running = match ? match[1].toLowerCase() === "true" : false;
    if (!running) return;
  }
  throw new Error(`Report ${identifier} still running after ${maxAttempts} attempts`);
}

async function getReportCsv(identifier: string): Promise<string> {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.reports.ws.five9.com/">
  <soapenv:Body>
    <ser:getReportResultCSV>
      <identifier>${identifier}</identifier>
    </ser:getReportResultCSV>
  </soapenv:Body>
</soapenv:Envelope>`;
  const response = await soapReportRequest(xml, "getReportResultCSV");
  const match = response.match(/<return[^>]*>([\s\S]*?)<\/return>/i);
  if (!match) return "";
  return match[1]
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#xd;/gi, "");
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}

function parseCsv(csv: string): Array<Record<string, string>> {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1)
    .map((line) => {
      const values = parseCsvLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h.trim()] = (values[i] || "").trim(); });
      return row;
    })
    .filter((row) => Object.values(row).some((v) => v !== ""));
}

function colGet(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== "") return row[k];
    const found = Object.keys(row).find((rk) => rk.toLowerCase() === k.toLowerCase());
    if (found && row[found] !== "") return row[found];
  }
  return "";
}

function parseIsoDate(raw: string): string | null {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return raw;
}

function parseSeconds(raw: string): number {
  if (!raw) return 0;
  if (raw.includes(":")) {
    const parts = raw.split(":").map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
  }
  return parseInt(raw) || 0;
}

function mapCsvRow(row: Record<string, string>, clientId: string) {
  const externalId = colGet(row, "Call ID", "Session GUID", "GUID", "Call GUID", "ID", "SessionGuid");
  if (!externalId) return null;

  const handleTimeSec = parseSeconds(
    colGet(row, "Handle Time", "Handling Time", "Total Handle Time", "Handle time")
  );
  const billableMinutes = handleTimeSec > 0 ? Math.ceil(handleTimeSec / 60) : 0;

  return {
    client_id: clientId,
    external_call_id: externalId,
    caller_phone: colGet(row, "ANI", "Caller ANI", "Caller Phone", "From Number") || null,
    campaign_name: colGet(row, "Campaign", "Campaign Name") || null,
    agent_name: colGet(row, "Agent", "Agent Name", "Agent Login") || null,
    disposition: colGet(row, "Disposition", "Call Disposition") || null,
    handle_time_seconds: handleTimeSec || null,
    billable_minutes: billableMinutes || null,
    call_date: parseIsoDate(colGet(row, "Date", "Call Date", "Start Date")),
    call_time: colGet(row, "Time", "Call Time", "Start Time") || null,
    call_type: "inbound",
    status: "completed",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Support both authenticated (manual) calls and unauthenticated scheduler calls
    let initiatedBy = "scheduler";
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const auth = await authenticateAgent(req, ["admin", "billing"]);
      if (auth.error) return auth.error;
      initiatedBy = auth.user.id;
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse body — optional period and client filter
    let body: { period_start?: string; period_end?: string; client_id?: string } = {};
    try { body = await req.json(); } catch { /* no body — scheduler call */ }

    let { period_start, period_end } = body;
    const { client_id: filterClientId } = body;

    if (!period_start || !period_end) {
      const now = new Date();
      const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
      const month = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth(); // 1-based
      period_start = `${year}-${String(month).padStart(2, "0")}-01`;
      period_end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    }

    // 1. Create mission
    const { data: mission, error: missionErr } = await supabase
      .from("missions")
      .insert({
        mission_type: "five9_report_pull",
        status: "running",
        period_start,
        period_end,
        initiated_by: initiatedBy,
        summary: `Five9 report pull for ${period_start} to ${period_end}`,
      })
      .select()
      .single();

    if (missionErr || !mission) {
      return new Response(
        JSON.stringify({ error: "Failed to create mission", details: missionErr }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.from("mission_control_events").insert({
      mission_id: mission.id,
      agent_name: "Five9ReportAgent",
      event_type: "started",
      message: `Five9 report pull started for ${period_start} → ${period_end}`,
    });

    // 2. Resolve active clients with Five9 campaign mappings
    const [{ data: mappings }, { data: activeLeads }] = await Promise.all([
      supabase
        .from("five9_campaign_mappings")
        .select("five9_campaign_name, campaign:campaign_id(client_lead_id)"),
      supabase
        .from("leads")
        .select("id, name, company")
        .eq("pipeline_stage", "active"),
    ]);

    const activeLeadMap = new Map((activeLeads || []).map((l: any) => [l.id, l]));

    type ClientMapping = { client_id: string; client_name: string; five9_campaign_name: string };
    const clientMappings: ClientMapping[] = (mappings || [])
      .filter((m: any) => m.campaign?.client_lead_id && activeLeadMap.has(m.campaign.client_lead_id))
      .filter((m: any) => !filterClientId || m.campaign.client_lead_id === filterClientId)
      .map((m: any) => {
        const lead = activeLeadMap.get(m.campaign.client_lead_id) as any;
        return {
          client_id: m.campaign.client_lead_id as string,
          client_name: (lead.name || lead.company || m.campaign.client_lead_id) as string,
          five9_campaign_name: m.five9_campaign_name as string,
        };
      });

    if (clientMappings.length === 0) {
      await supabase.from("missions").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        summary: "No active clients with Five9 campaign mappings found.",
      }).eq("id", mission.id);

      return new Response(
        JSON.stringify({ status: "completed", mission_id: mission.id, clients_processed: 0, new_rows: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Process each client
    let hasErrors = false;
    let totalNewRows = 0;
    const processedClients: string[] = [];

    for (const cm of clientMappings) {
      try {
        await supabase.from("mission_control_events").insert({
          mission_id: mission.id,
          agent_name: "Five9ReportAgent",
          event_type: "step",
          message: `Pulling report for ${cm.client_name} (campaign: ${cm.five9_campaign_name})`,
        });

        const identifier = await runReport("Call Log", cm.five9_campaign_name, period_start!, period_end!);
        await pollUntilReady(identifier);
        const csv = await getReportCsv(identifier);

        const csvRows = parseCsv(csv);
        const records = csvRows
          .map((r) => mapCsvRow(r, cm.client_id))
          .filter(Boolean) as NonNullable<ReturnType<typeof mapCsvRow>>[];

        if (records.length === 0) {
          await supabase.from("mission_control_events").insert({
            mission_id: mission.id,
            agent_name: "Five9ReportAgent",
            event_type: "step",
            message: `${cm.client_name}: CSV contained no parseable rows`,
          });
          processedClients.push(cm.client_id);
          continue;
        }

        // Skip records already captured by webhook
        const externalIds = records.map((r) => r.external_call_id).filter(Boolean) as string[];
        const { data: existing } = await supabase
          .from("call_logs")
          .select("external_call_id")
          .in("external_call_id", externalIds);
        const existingSet = new Set((existing || []).map((r: any) => r.external_call_id));
        const newRecords = records.filter((r) => !existingSet.has(r.external_call_id));

        // Capture pre-insert minutes for variance detection
        const { data: existingLogs } = await supabase
          .from("call_logs")
          .select("billable_minutes")
          .eq("client_id", cm.client_id)
          .gte("call_date", period_start!)
          .lte("call_date", period_end!);
        const existingMinutes = (existingLogs || []).reduce(
          (s: number, l: any) => s + (Number(l.billable_minutes) || 0), 0
        );
        const csvTotalMinutes = records.reduce((s, r) => s + (r.billable_minutes || 0), 0);

        if (newRecords.length > 0) {
          const { error: insertErr } = await supabase.from("call_logs").insert(newRecords);
          if (insertErr) throw insertErr;
          totalNewRows += newRecords.length;
        }

        // Variance: if new rows pushed delta > 5%
        const newMinutes = newRecords.reduce((s, r) => s + (r.billable_minutes || 0), 0);
        const updatedMinutes = existingMinutes + newMinutes;
        const deltaMinutes = csvTotalMinutes - updatedMinutes;
        const deltaPct = updatedMinutes > 0 ? (deltaMinutes / updatedMinutes) * 100 : 0;

        if (newRecords.length > 0 && Math.abs(deltaPct) > 5) {
          await supabase.from("variance_queue").insert({
            client_id: cm.client_id,
            period_start,
            period_end,
            variance_type: "five9_gap",
            expected_minutes: csvTotalMinutes,
            actual_minutes: updatedMinutes,
            delta_minutes: deltaMinutes,
            delta_pct: deltaPct,
            status: "open",
            mission_id: mission.id,
            raw_details: {
              campaign: cm.five9_campaign_name,
              new_rows: newRecords.length,
              skipped_webhook_rows: records.length - newRecords.length,
            },
          });
        }

        await supabase.from("mission_control_events").insert({
          mission_id: mission.id,
          agent_name: "Five9ReportAgent",
          event_type: "step",
          message: `${cm.client_name}: ${records.length} CSV rows, ${newRecords.length} new, ${records.length - newRecords.length} already in DB`,
        });

        await supabase.from("agent_runs").insert({
          mission_id: mission.id,
          agent_name: "Five9ReportAgent",
          step_name: "pull_report",
          input_snapshot: { client_id: cm.client_id, campaign: cm.five9_campaign_name, period_start, period_end },
          output_snapshot: {
            csv_rows: records.length,
            new_rows: newRecords.length,
            skipped: records.length - newRecords.length,
            variance_flagged: newRecords.length > 0 && Math.abs(deltaPct) > 5,
          },
          success: true,
        });

        processedClients.push(cm.client_id);
      } catch (err) {
        hasErrors = true;
        await Promise.all([
          supabase.from("agent_runs").insert({
            mission_id: mission.id,
            agent_name: "Five9ReportAgent",
            step_name: "pull_report",
            input_snapshot: { client_id: cm.client_id, campaign: cm.five9_campaign_name },
            success: false,
            error_message: String(err),
          }),
          supabase.from("mission_control_events").insert({
            mission_id: mission.id,
            agent_name: "Five9ReportAgent",
            event_type: "error",
            message: `Error for ${cm.client_name}: ${String(err).substring(0, 200)}`,
          }),
        ]);
      }
    }

    // 4. Finalise mission
    const finalStatus = hasErrors
      ? processedClients.length > 0 ? "needs_review" : "error"
      : "completed";

    await supabase.from("missions").update({
      status: finalStatus,
      error_flag: hasErrors,
      completed_at: new Date().toISOString(),
      summary: `Pulled Five9 reports for ${processedClients.length}/${clientMappings.length} clients. ${totalNewRows} new call log rows added.`,
    }).eq("id", mission.id);

    await supabase.from("mission_control_events").insert({
      mission_id: mission.id,
      agent_name: "Five9ReportAgent",
      event_type: "finished",
      message: `Pull ${finalStatus}. ${processedClients.length} clients processed, ${totalNewRows} new rows.`,
    });

    // 5. Cross-dashboard notifications
    const { data: adminUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "billing"]);

    for (const u of (adminUsers || [])) {
      await supabase.from("notifications").insert({
        user_id: u.user_id,
        title: `Five9 Report Pull ${finalStatus === "completed" ? "Complete" : "Has Issues"}`,
        message: `Pulled Five9 call logs for ${processedClients.length} clients — ${totalNewRows} new records added.`,
        category: "billing",
        action_url: "/admin/mission-control",
      });
    }

    return new Response(
      JSON.stringify({ status: finalStatus, mission_id: mission.id, clients_processed: processedClients.length, new_rows: totalNewRows }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
