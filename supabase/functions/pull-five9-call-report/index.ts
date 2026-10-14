import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, authenticateAgent } from "../_shared/agent-auth.ts";
import { calcBillableMinutes } from "../_shared/billing.ts";

const FIVE9_USERNAME = Deno.env.get("FIVE9_USERNAME") ?? "";
const FIVE9_PASSWORD = Deno.env.get("FIVE9_PASSWORD") ?? "";
// Five9 Admin API v13 — reporting methods (runReport, isReportRunning, getReportResultCsv)
// are confirmed present in the Admin API WSDL. The separate wsreports/ service returns 404.
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
  // Make the request manually to capture session cookies for load-balancer affinity
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
  // Capture session cookies for backend-affinity on follow-up calls
  const cookies: string[] = [];
  if ("getSetCookie" in res.headers) {
    const setCookies = (res.headers as unknown as { getSetCookie(): string[] }).getSetCookie();
    for (const sc of setCookies) cookies.push(sc.split(";")[0].trim());
  } else {
    const sc = res.headers.get("set-cookie");
    if (sc) cookies.push(sc.split(";")[0].trim());
  }
  const sessionCookie = cookies.join("; ");
  // Identifier is an opaque string token (not just digits)
  const match = text.match(/<return[^>]*>([^<]+)<\/return>/);
  if (!match) throw new Error(`Could not parse report identifier: ${text.substring(0, 400)}`);
  return { identifier: match[1], sessionCookie };
}

async function pollUntilReady(
  identifier: string,
  sessionCookie: string,
  maxAttempts = 15
): Promise<void> {
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

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

// Call Log TIMESTAMP looks like "Tue, 13 Oct 2026 00:33:32" — parsed as-is
// (no Date()) so the Five9 domain's wall-clock time isn't shifted to UTC.
function parseFive9Timestamp(raw: string): { date: string | null; time: string | null } {
  const m = raw.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{1,2}:\d{2}:\d{2})/);
  if (!m) return { date: null, time: null };
  const month = MONTHS[m[2].toLowerCase()];
  if (!month) return { date: null, time: null };
  return { date: `${m[3]}-${month}-${m[1].padStart(2, "0")}`, time: m[4].padStart(8, "0") };
}

function parseSeconds(raw: string): number {
  if (!raw) return 0;
  if (raw.includes(":")) {
    const parts = raw.split(":").map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 3) return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
    if (parts.length === 2) return Math.round(parts[0] * 60 + parts[1]);
  }
  return parseInt(raw) || 0;
}

// PostgREST errors are plain objects, so String(err) yields "[object Object]".
function errText(err: unknown): string {
  if (err instanceof Error) return String(err);
  if (err && typeof err === "object") return JSON.stringify(err);
  return String(err);
}

// Maps a row from the "Call Log Reports / Call Log" CSV.
function mapCsvRow(row: Record<string, string>, clientId: string) {
  const externalId = colGet(row, "CALL ID");
  if (!externalId) return null;

  const { date: callDate, time: callTime } = parseFive9Timestamp(colGet(row, "TIMESTAMP"));
  const talkTimeSec = parseSeconds(colGet(row, "TALK TIME"));
  const acwSec = parseSeconds(colGet(row, "AFTER CALL WORK TIME"));
  const handleTimeSec = talkTimeSec + acwSec;
  const direction = colGet(row, "CALL TYPE").toLowerCase().startsWith("outbound") ? "outbound" : "inbound";

  return {
    client_id: clientId,
    external_call_id: externalId,
    caller_phone: colGet(row, "ANI") || null,
    caller_name: colGet(row, "CUSTOMER NAME") || null,
    campaign_name: colGet(row, "CAMPAIGN") || null,
    agent_name: colGet(row, "AGENT NAME") || null,
    disposition: colGet(row, "DISPOSITION") || null,
    talk_time_seconds: talkTimeSec,
    acw_seconds: acwSec,
    handle_time_seconds: handleTimeSec,
    call_duration: handleTimeSec,
    billable_minutes: 0, // set by mergeCallSegments once all segments are combined
    call_date: callDate,
    call_time: callTime,
    call_direction: direction,
    call_type: direction,
    status: (colGet(row, "ABANDONED") === "1" ? "missed" : "completed") as "completed" | "missed",
  };
}

type CallLogRow = NonNullable<ReturnType<typeof mapCsvRow>>;

// Call Log emits one row per call segment (transfers, conferences, voicemail),
// all sharing the same CALL ID. Collapse them into one call: times are summed,
// first segment wins for timestamp/caller, last non-empty agent/disposition wins,
// and the call is "missed" only if every segment was abandoned. Billing rules
// are applied to the merged call.
function mergeCallSegments(rows: CallLogRow[]): CallLogRow[] {
  const byId = new Map<string, CallLogRow>();
  for (const r of rows) {
    const prev = byId.get(r.external_call_id);
    if (!prev) { byId.set(r.external_call_id, { ...r }); continue; }
    prev.talk_time_seconds += r.talk_time_seconds;
    prev.acw_seconds += r.acw_seconds;
    prev.handle_time_seconds += r.handle_time_seconds;
    prev.call_duration += r.call_duration;
    prev.agent_name = r.agent_name ?? prev.agent_name;
    prev.disposition = r.disposition ?? prev.disposition;
    prev.caller_name = prev.caller_name ?? r.caller_name;
    if (r.status === "completed") prev.status = "completed";
  }
  const merged = [...byId.values()];
  for (const call of merged) {
    call.billable_minutes = calcBillableMinutes({
      status: call.status,
      talkTimeSeconds: call.talk_time_seconds,
      acwSeconds: call.acw_seconds,
      disposition: call.disposition,
    });
  }
  return merged;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Support both authenticated (manual) calls and unauthenticated scheduler calls
    let initiatedBy = "scheduler";
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      // pg_cron calls with the service-role key — treated as the scheduler.
      const auth = await authenticateAgent(req, ["admin", "billing"], { allowServiceRole: true });
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

    // One entry per client — a client can own several Five9 campaigns.
    type ClientMapping = { client_id: string; client_name: string; five9_campaign_names: string[] };
    const byClient = new Map<string, ClientMapping>();
    for (const m of (mappings || []) as any[]) {
      const clientId = m.campaign?.client_lead_id as string | undefined;
      if (!clientId || !activeLeadMap.has(clientId)) continue;
      if (filterClientId && clientId !== filterClientId) continue;
      const lead = activeLeadMap.get(clientId) as any;
      const entry = byClient.get(clientId) ?? {
        client_id: clientId,
        client_name: (lead.name || lead.company || clientId) as string,
        five9_campaign_names: [],
      };
      entry.five9_campaign_names.push(m.five9_campaign_name as string);
      byClient.set(clientId, entry);
    }
    const clientMappings = [...byClient.values()];

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

    // 3. Pull the report once — it covers every campaign — then route rows per client.
    // "Campaign Activity" only exports PDF/Excel; Call Log supports CSV.
    let hasErrors = false;
    let totalNewRows = 0;
    const processedClients: string[] = [];

    let csvRows: Array<Record<string, string>> = [];
    try {
      const { identifier, sessionCookie } = await runReport("Call Log Reports", "Call Log", period_start!, period_end!);
      await pollUntilReady(identifier, sessionCookie);
      csvRows = parseCsv(await getReportCsv(identifier, sessionCookie));
    } catch (err) {
      hasErrors = true;
      await Promise.all([
        supabase.from("agent_runs").insert({
          mission_id: mission.id,
          agent_name: "Five9ReportAgent",
          step_name: "pull_report",
          input_snapshot: { period_start, period_end },
          success: false,
          error_message: errText(err),
        }),
        supabase.from("mission_control_events").insert({
          mission_id: mission.id,
          agent_name: "Five9ReportAgent",
          event_type: "error",
          message: `Error pulling Call Log report: ${errText(err).substring(0, 200)}`,
        }),
      ]);
    }

    for (const cm of hasErrors ? [] : clientMappings) {
      try {
        // Only keep rows for this client's Five9 campaigns — the report isn't filtered server-side.
        const campaigns = new Set(cm.five9_campaign_names);
        const records = mergeCallSegments(
          csvRows
            .filter((r) => campaigns.has(colGet(r, "CAMPAIGN")))
            .map((r) => mapCsvRow(r, cm.client_id))
            .filter(Boolean) as CallLogRow[]
        );

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
              campaigns: cm.five9_campaign_names,
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
          input_snapshot: { client_id: cm.client_id, campaigns: cm.five9_campaign_names, period_start, period_end },
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
            input_snapshot: { client_id: cm.client_id, campaigns: cm.five9_campaign_names },
            success: false,
            error_message: errText(err),
          }),
          supabase.from("mission_control_events").insert({
            mission_id: mission.id,
            agent_name: "Five9ReportAgent",
            event_type: "error",
            message: `Error for ${cm.client_name}: ${errText(err).substring(0, 200)}`,
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

    // 5. Cross-dashboard notifications — only alert on a status *change* from the
    // previous run so a standing failure doesn't re-notify everyone every day.
    const { data: previousMission } = await supabase
      .from("missions")
      .select("status")
      .eq("mission_type", "five9_report_pull")
      .neq("id", mission.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const statusChanged = (previousMission?.status ?? null) !== finalStatus;

    if (statusChanged) {
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
