import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, authenticateAgent } from "../_shared/agent-auth.ts";

// Same Five9 Admin API pattern as pull-five9-call-report, but routes results
// through client_report_mappings (match_type = 'wl_campaign') into
// wl_call_logs instead of the direct-client call_logs table — mirroring how
// ingest-five9-call routes live webhook calls for WL clients.

const FIVE9_USERNAME = Deno.env.get("FIVE9_USERNAME") ?? "";
const FIVE9_PASSWORD = Deno.env.get("FIVE9_PASSWORD") ?? "";
const ADMIN_URL = `https://api.five9.com/wsadmin/v13/AdminWebService?user=${encodeURIComponent(FIVE9_USERNAME)}`;
const ADMIN_NS = "http://service.admin.ws.five9.com/";

function basicAuth() {
  return btoa(`${FIVE9_USERNAME}:${FIVE9_PASSWORD}`);
}

async function soapAdminRequest(body: string, action: string, extraHeaders?: Record<string, string>): Promise<string> {
  const res = await fetch(ADMIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml;charset=UTF-8",
      "Authorization": `Basic ${basicAuth()}`,
      "SOAPAction": `${ADMIN_NS}${action}`,
      "Accept": "text/xml",
      ...(extraHeaders ?? {}),
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Five9 Admin ${action} error ${res.status}: ${text.substring(0, 400)}`);
  return text;
}

async function runReport(
  folderName: string,
  reportName: string,
  startDate: string,
  endDate: string
): Promise<{ identifier: string; sessionCookie: string }> {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="${ADMIN_NS}">
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
  const res = await fetch(ADMIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml;charset=UTF-8",
      "Authorization": `Basic ${basicAuth()}`,
      "SOAPAction": `${ADMIN_NS}runReport`,
      "Accept": "text/xml",
    },
    body: xml,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Five9 Admin runReport error ${res.status}: ${text.substring(0, 400)}`);
  const cookies: string[] = [];
  if ("getSetCookie" in res.headers) {
    const setCookies = (res.headers as unknown as { getSetCookie(): string[] }).getSetCookie();
    for (const sc of setCookies) cookies.push(sc.split(";")[0].trim());
  } else {
    const sc = res.headers.get("set-cookie");
    if (sc) cookies.push(sc.split(";")[0].trim());
  }
  const sessionCookie = cookies.join("; ");
  const match = text.match(/<return[^>]*>([^<]+)<\/return>/);
  if (!match) throw new Error(`Could not parse report identifier: ${text.substring(0, 400)}`);
  return { identifier: match[1], sessionCookie };
}

async function pollUntilReady(identifier: string, sessionCookie: string, maxAttempts = 15): Promise<void> {
  const cookieHeader = sessionCookie ? { "Cookie": sessionCookie } : {};
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, 3000));
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="${ADMIN_NS}">
  <soapenv:Body><ser:isReportRunning><identifier>${identifier}</identifier></ser:isReportRunning></soapenv:Body>
</soapenv:Envelope>`;
    try {
      const response = await soapAdminRequest(xml, "isReportRunning", cookieHeader);
      const match = response.match(/<return[^>]*>(true|false)<\/return>/i);
      const running = match ? match[1].toLowerCase() === "true" : false;
      if (!running) return;
    } catch {
      // Five9 sometimes returns 500 when report is done — treat as complete and proceed
      return;
    }
  }
  throw new Error(`Report ${identifier} still running after ${maxAttempts} attempts`);
}

async function getReportCsv(identifier: string, sessionCookie: string): Promise<string> {
  const cookieHeader = sessionCookie ? { "Cookie": sessionCookie } : {};
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="${ADMIN_NS}">
  <soapenv:Body><ser:getReportResultCsv><identifier>${identifier}</identifier></ser:getReportResultCsv></soapenv:Body>
</soapenv:Envelope>`;
  const response = await soapAdminRequest(xml, "getReportResultCsv", cookieHeader);
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

function mapCsvRowToWlCallLog(row: Record<string, string>, partnerId: string, wlClientId: string) {
  const externalId = colGet(row, "Call ID", "Session GUID", "GUID", "Call GUID", "ID", "SessionGuid");
  if (!externalId) return null;

  const handleTimeSec = parseSeconds(
    colGet(row, "Handle Time", "Handling Time", "Total Handle Time", "Handle time")
  );
  const billableMinutes = handleTimeSec > 0 ? Math.ceil(handleTimeSec / 60) : 0;
  const campaignName = colGet(row, "Campaign", "Campaign Name") || null;

  return {
    partner_id: partnerId,
    wl_client_id: wlClientId,
    external_call_id: externalId,
    caller_phone: colGet(row, "ANI", "Caller ANI", "Caller Phone", "From Number") || null,
    campaign_name: campaignName,
    agent_name: colGet(row, "Agent", "Agent Name", "Agent Login") || null,
    disposition: colGet(row, "Disposition", "Call Disposition") || null,
    handle_time_seconds: handleTimeSec || null,
    call_duration: handleTimeSec || null,
    billable_minutes: billableMinutes || null,
    call_date: parseIsoDate(colGet(row, "Date", "Call Date", "Start Date")),
    call_time: colGet(row, "Time", "Call Time", "Start Time") || null,
    call_direction: "inbound",
    call_type: "inbound",
    status: "completed",
    _campaignName: campaignName, // stripped before insert — used only for client-side filtering
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    let body: { period_start?: string; period_end?: string; match_value?: string; partner_id?: string; days_back?: number } = {};
    try { body = await req.json(); } catch { /* no body */ }

    let { period_start, period_end } = body;
    const { match_value: filterMatchValue, partner_id: filterPartnerId, days_back } = body;

    if (!period_start || !period_end) {
      // Default: last 30 days, or days_back if provided (e.g. a 90-day backfill)
      const now = new Date();
      period_end = now.toISOString().slice(0, 10);
      const start = new Date(now);
      start.setUTCDate(start.getUTCDate() - (days_back && days_back > 0 ? days_back : 30));
      period_start = start.toISOString().slice(0, 10);
    }

    // 1. Create mission
    const { data: mission, error: missionErr } = await supabase
      .from("missions")
      .insert({
        mission_type: "wl_five9_report_pull",
        status: "running",
        period_start,
        period_end,
        initiated_by: initiatedBy,
        summary: `WL Five9 report pull for ${period_start} to ${period_end}`,
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
      agent_name: "WLFive9ReportAgent",
      event_type: "started",
      message: `WL Five9 report pull started for ${period_start} → ${period_end}`,
    });

    // 2. Resolve active WL campaign mappings
    let mappingQuery = supabase
      .from("client_report_mappings")
      .select("wl_client_id, partner_id, match_value")
      .eq("match_type", "wl_campaign")
      .eq("is_active", true)
      .not("wl_client_id", "is", null);
    if (filterMatchValue) mappingQuery = mappingQuery.eq("match_value", filterMatchValue);
    if (filterPartnerId) mappingQuery = mappingQuery.eq("partner_id", filterPartnerId);

    const { data: mappings } = await mappingQuery;

    const clientMappings = (mappings || []) as Array<{ wl_client_id: string; partner_id: string; match_value: string }>;

    if (clientMappings.length === 0) {
      await supabase.from("missions").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        summary: "No active WL campaign mappings found.",
      }).eq("id", mission.id);

      return new Response(
        JSON.stringify({ status: "completed", mission_id: mission.id, clients_processed: 0, new_rows: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Process each WL client mapping
    let hasErrors = false;
    let totalNewRows = 0;
    const processedClients: string[] = [];

    for (const cm of clientMappings) {
      try {
        await supabase.from("mission_control_events").insert({
          mission_id: mission.id,
          agent_name: "WLFive9ReportAgent",
          event_type: "step",
          message: `Pulling report for WL client ${cm.wl_client_id} (campaign: ${cm.match_value})`,
        });

        const { identifier, sessionCookie } = await runReport("Campaign Reports", "Campaign Activity", period_start!, period_end!);
        await pollUntilReady(identifier, sessionCookie);
        const csv = await getReportCsv(identifier, sessionCookie);

        const csvRows = parseCsv(csv);
        const mapped = csvRows
          .map((r) => mapCsvRowToWlCallLog(r, cm.partner_id, cm.wl_client_id))
          .filter(Boolean) as NonNullable<ReturnType<typeof mapCsvRowToWlCallLog>>[];
        // Only keep rows whose CSV "Campaign" column matches this mapping's
        // Five9 campaign name — the report itself isn't filtered server-side.
        const records = mapped.filter((r) => !r._campaignName || r._campaignName === cm.match_value);

        if (records.length === 0) {
          await supabase.from("mission_control_events").insert({
            mission_id: mission.id,
            agent_name: "WLFive9ReportAgent",
            event_type: "step",
            message: `${cm.match_value}: CSV contained no matching rows for this campaign`,
          });
          processedClients.push(cm.wl_client_id);
          continue;
        }

        // Skip records already captured (webhook or a previous pull)
        const externalIds = records.map((r) => r.external_call_id).filter(Boolean) as string[];
        const { data: existing } = await supabase
          .from("wl_call_logs")
          .select("external_call_id")
          .in("external_call_id", externalIds);
        const existingSet = new Set((existing || []).map((r: any) => r.external_call_id));
        const newRecords = records
          .filter((r) => !existingSet.has(r.external_call_id))
          .map(({ _campaignName, ...insertable }) => insertable);

        if (newRecords.length > 0) {
          const { error: insertErr } = await supabase.from("wl_call_logs").insert(newRecords);
          if (insertErr) throw insertErr;
          totalNewRows += newRecords.length;
        }

        await supabase.from("mission_control_events").insert({
          mission_id: mission.id,
          agent_name: "WLFive9ReportAgent",
          event_type: "step",
          message: `${cm.match_value}: ${records.length} matching CSV rows, ${newRecords.length} new, ${records.length - newRecords.length} already in DB`,
        });

        await supabase.from("agent_runs").insert({
          mission_id: mission.id,
          agent_name: "WLFive9ReportAgent",
          step_name: "pull_wl_report",
          input_snapshot: { wl_client_id: cm.wl_client_id, campaign: cm.match_value, period_start, period_end },
          output_snapshot: {
            csv_rows: records.length,
            new_rows: newRecords.length,
            skipped: records.length - newRecords.length,
          },
          success: true,
        });

        processedClients.push(cm.wl_client_id);
      } catch (err) {
        hasErrors = true;
        await Promise.all([
          supabase.from("agent_runs").insert({
            mission_id: mission.id,
            agent_name: "WLFive9ReportAgent",
            step_name: "pull_wl_report",
            input_snapshot: { wl_client_id: cm.wl_client_id, campaign: cm.match_value },
            success: false,
            error_message: String(err),
          }),
          supabase.from("mission_control_events").insert({
            mission_id: mission.id,
            agent_name: "WLFive9ReportAgent",
            event_type: "error",
            message: `Error for ${cm.match_value}: ${String(err).substring(0, 200)}`,
          }),
        ]);
      }
    }

    const finalStatus = hasErrors
      ? processedClients.length > 0 ? "needs_review" : "error"
      : "completed";

    await supabase.from("missions").update({
      status: finalStatus,
      error_flag: hasErrors,
      completed_at: new Date().toISOString(),
      summary: `Pulled WL Five9 reports for ${processedClients.length}/${clientMappings.length} clients. ${totalNewRows} new call log rows added.`,
    }).eq("id", mission.id);

    await supabase.from("mission_control_events").insert({
      mission_id: mission.id,
      agent_name: "WLFive9ReportAgent",
      event_type: "finished",
      message: `Pull ${finalStatus}. ${processedClients.length} clients processed, ${totalNewRows} new rows.`,
    });

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
