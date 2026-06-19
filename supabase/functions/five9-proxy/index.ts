import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const FIVE9_USERNAME = Deno.env.get("FIVE9_USERNAME") ?? "";
const FIVE9_PASSWORD = Deno.env.get("FIVE9_PASSWORD") ?? "";

const SOAP_URL = `https://api.five9.com/wsadmin/v13/AdminWebService?user=${encodeURIComponent(FIVE9_USERNAME)}`;
const REPORTING_URL = "https://api.five9.com/wsreports/v12/ReportingService";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const cache = new Map<string, { data: unknown; expires: number }>();

function getCached(key: string) {
    const entry = cache.get(key);
    if (entry && entry.expires > Date.now()) return entry.data;
    cache.delete(key);
    return null;
}

function setCache(key: string, data: unknown, ttlSeconds = 60) {
    cache.set(key, { data, expires: Date.now() + ttlSeconds * 1000 });
}

function basicAuth() {
    return btoa(`${FIVE9_USERNAME}:${FIVE9_PASSWORD}`);
}

async function soapReportRequest(body: string, action = ""): Promise<string> {
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
    if (!res.ok) throw new Error(`Five9 Reporting error: ${res.status} ${text.substring(0, 200)}`);
    return text;
}

async function soapRequest(body: string, action = ""): Promise<string> {
    const res = await fetch(SOAP_URL, {
        method: "POST",
        headers: {
            "Content-Type": "text/xml;charset=UTF-8",
            "Authorization": `Basic ${basicAuth()}`,
            "SOAPAction": `http://service.admin.ws.five9.com/${action}`,
            "Accept": "text/xml",
        },
        body,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Five9 SOAP error: ${res.status} ${text}`);
    return text;
}

function parseXmlObjects(xml: string, wrapperTag: string, fields: string[]): Record<string, string>[] {
    const items: Record<string, string>[] = [];
    const wrapperRegex = new RegExp(`<${wrapperTag}[^>]*>([\\s\\S]*?)<\\/${wrapperTag}>`, "g");
    let wrapper;
    while ((wrapper = wrapperRegex.exec(xml)) !== null) {
        const item: Record<string, string> = {};
        for (const field of fields) {
            const match = wrapper[1].match(new RegExp(`<${field}[^>]*>([^<]*)<\\/${field}>`));
            item[field] = match ? match[1] : "";
        }
        items.push(item);
    }
    return items;
}

async function getUsers() {
    const cached = getCached("users");
    if (cached) return cached;

    // v13: method renamed to getUsersInfo; user fields nested inside <generalInfo>
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.admin.ws.five9.com/">
  <soapenv:Body><ser:getUsersInfo><userNamePattern>.*</userNamePattern></ser:getUsersInfo></soapenv:Body>
</soapenv:Envelope>`;

    const response = await soapRequest(xml, "getUsersInfo");
    // v13 userInfo wraps fields in <generalInfo>; email element is "EMail" (capital)
    const raw = parseXmlObjects(response, "generalInfo", ["userName", "firstName", "lastName", "EMail", "active", "extension"]);
    const users = raw.map(u => ({ userName: u.userName, firstName: u.firstName, lastName: u.lastName, email: u.EMail, active: u.active, extension: u.extension }));
    if (users.length === 0) return { raw: response.substring(0, 3000), users };
    setCache("users", users, 300);
    return users;
}

async function getCampaigns() {
    const cached = getCached("campaigns");
    if (cached) return cached;

    // v13: namePattern renamed to campaignNamePattern
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.admin.ws.five9.com/">
  <soapenv:Body><ser:getCampaigns><campaignNamePattern>.*</campaignNamePattern></ser:getCampaigns></soapenv:Body>
</soapenv:Envelope>`;

    const response = await soapRequest(xml, "getCampaigns");
    const campaigns = parseXmlObjects(response, "return", ["name", "type", "state", "description"]);
    if (campaigns.length === 0) return { raw: response.substring(0, 3000), campaigns };
    setCache("campaigns", campaigns, 300);
    return campaigns;
}

async function getSkills() {
    const cached = getCached("skills");
    if (cached) return cached;

    // v13: namePattern renamed to skillNamePattern
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.admin.ws.five9.com/">
  <soapenv:Body><ser:getSkills><skillNamePattern>.*</skillNamePattern></ser:getSkills></soapenv:Body>
</soapenv:Envelope>`;

    const response = await soapRequest(xml, "getSkills");
    const skills = parseXmlObjects(response, "return", ["name", "description"]);
    if (skills.length === 0) return { raw: response.substring(0, 3000), skills };
    setCache("skills", skills, 300);
    return skills;
}

async function getDispositions() {
    const cached = getCached("dispositions");
    if (cached) return cached;

    // v13: namePattern renamed to dispositionNamePattern
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.admin.ws.five9.com/">
  <soapenv:Body><ser:getDispositions><dispositionNamePattern>.*</dispositionNamePattern></ser:getDispositions></soapenv:Body>
</soapenv:Envelope>`;

    const response = await soapRequest(xml, "getDispositions");
    const dispositions = parseXmlObjects(response, "return", ["name", "type", "description"]);
    if (dispositions.length === 0) return { raw: response.substring(0, 3000), dispositions };
    setCache("dispositions", dispositions, 300);
    return dispositions;
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const url = new URL(req.url);
        const action = url.searchParams.get("action");

        let data;
        switch (action) {
            case "users": data = await getUsers(); break;
            case "campaigns": data = await getCampaigns(); break;
            case "skills": data = await getSkills(); break;
            case "dispositions": data = await getDispositions(); break;
            case "test": {
                const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.admin.ws.five9.com/">
  <soapenv:Body><ser:getApiVersions/></soapenv:Body>
</soapenv:Envelope>`;
                const testRes = await fetch(SOAP_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "text/xml;charset=UTF-8",
                        "Authorization": `Basic ${btoa(FIVE9_USERNAME + ":" + FIVE9_PASSWORD)}`,
                        "SOAPAction": "http://service.admin.ws.five9.com/getApiVersions",
                    },
                    body: testXml,
                });
                const testBody = await testRes.text();
                const isAuthError = testRes.status === 401 || testBody.includes("InvalidAccountFault") || testBody.includes("password");
                const isLocked = testBody.toLowerCase().includes("locked");
                data = {
                    status: testRes.status,
                    ok: testRes.ok,
                    url: SOAP_URL,
                    username: FIVE9_USERNAME,
                    diagnosis: testRes.ok
                        ? "Auth succeeded"
                        : isLocked
                            ? "ACCOUNT LOCKED — unlock in Five9 admin console under Users"
                            : isAuthError
                                ? "AUTH FAILED — check FIVE9_PASSWORD secret matches the Five9 admin password"
                                : `Unexpected error (HTTP ${testRes.status})`,
                    raw_response: testBody.substring(0, 2000),
                };
                break;
            }
            case "wsdlInfo": {
                // Fetch Admin WSDL with auth and extract all operation names + service addresses
                const wsdlR = await fetch(`https://api.five9.com/wsadmin/v13/AdminWebService?wsdl&user=${encodeURIComponent(FIVE9_USERNAME)}`, {
                    headers: { "Authorization": `Basic ${basicAuth()}` },
                });
                const wsdlBody = await wsdlR.text();
                const addresses = [...wsdlBody.matchAll(/location="([^"]+)"/gi)].map(m => m[1]);
                const allOps = [...wsdlBody.matchAll(/<wsdl:operation\s+name="([^"]+)"/gi)].map(m => m[1]);
                const reportOps = allOps.filter(op => /report|csv|export|statistic/i.test(op));
                data = {
                    status: wsdlR.status,
                    addresses,
                    all_ops_count: allOps.length,
                    report_related_ops: reportOps,
                    all_ops: allOps.sort(),
                    wsdl_tail: wsdlBody.slice(-2000),
                };
                break;
            }
            case "supervisorTest": {
                // Probe Five9 Supervisor SOAP API v13 — get full ops list
                const supUrl = `https://api.five9.com/wssupervisor/v13/SupervisorWebService`;
                const wsdlR = await fetch(`${supUrl}?wsdl`, {
                    headers: { "Authorization": `Basic ${basicAuth()}` },
                });
                const wsdlBody = await wsdlR.text();
                const allSupOps = [...wsdlBody.matchAll(/<wsdl:operation\s+name="([^"]+)"/gi)].map(m => m[1]);
                // Deduplicate (WSDL may repeat each op)
                const uniqueOps = [...new Set(allSupOps)].sort();
                data = {
                    status: wsdlR.status,
                    ops_count: uniqueOps.length,
                    all_ops: uniqueOps,
                    stats_ops: uniqueOps.filter(op => /statistic|stat|call|log|histor|record|count|session|agent|campaign/i.test(op)),
                };
                break;
            }
            case "testRestApi": {
                // Probe Five9 REST API endpoints — alternative to SOAP Reporting
                const restVariants: Record<string, { url: string; method: string }> = {
                    "rest-api-calls":       { url: "https://api.five9.com/api/v1/calls", method: "GET" },
                    "rest-app-calls":       { url: "https://app.five9.com/api/v1/calls", method: "GET" },
                    "rest-reporting-api":   { url: "https://api.five9.com/api/reporting/v1/", method: "GET" },
                    "rest-app-supervisor":  { url: `https://app.five9.com/api/v1/supervisors/${encodeURIComponent(FIVE9_USERNAME)}/calldata`, method: "GET" },
                    "admin-wsdl":           { url: "https://api.five9.com/wsadmin/v13/AdminWebService?wsdl", method: "GET" },
                };
                const restResults: Record<string, unknown> = {};
                for (const [label, { url: rUrl, method }] of Object.entries(restVariants)) {
                    try {
                        const r = await fetch(rUrl, {
                            method,
                            headers: {
                                "Authorization": `Basic ${basicAuth()}`,
                                "Accept": "application/json, text/xml, */*",
                            },
                        });
                        const body = await r.text();
                        restResults[label] = { status: r.status, ok: r.ok, snippet: body.substring(0, 400) };
                    } catch (e: unknown) {
                        restResults[label] = { error: (e as Error).message };
                    }
                }
                data = restResults;
                break;
            }
            case "testReporting": {
                // Probe multiple Five9 Reporting API URL variants to find which responds
                const probeXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.reports.ws.five9.com/">
  <soapenv:Body>
    <ser:runReport>
      <folderName>Call Log</folderName>
      <reportName>Call Log</reportName>
      <criteria><time><start>2026-05-01T00:00:00.000</start><end>2026-05-01T23:59:59.000</end></time></criteria>
    </ser:runReport>
  </soapenv:Body>
</soapenv:Envelope>`;
                const urlVariants: Record<string, string> = {
                    // app.five9.com — Tomcat server, more likely to have the path
                    "app-v2":           `https://app.five9.com/wsreports/v2/ReportingService`,
                    "app-v2-user":      `https://app.five9.com/wsreports/v2/ReportingService?user=${encodeURIComponent(FIVE9_USERNAME)}`,
                    "app-noversion":    `https://app.five9.com/wsreports/ReportingService`,
                    "app-wss":          `https://app.five9.com/wss/ReportingService`,
                    "app-api-reports":  `https://app.five9.com/api/reports/v2/ReportingService`,
                    "app-api-v1":       `https://app.five9.com/api/v1/reporting/ReportingService`,
                    // Try WSDL URL as a GET — if it responds we know the base URL is right
                    "app-wsdl-get":     `https://app.five9.com/wsreports/v2/ReportingService?wsdl`,
                    // Different known Five9 subdomains
                    "api-v2":           `https://api.five9.com/wsreports/v2/ReportingService`,
                    "api-wsdl-get":     `https://api.five9.com/wsreports/v2/ReportingService?wsdl`,
                };
                const results: Record<string, unknown> = {};
                for (const [label, testUrl] of Object.entries(urlVariants)) {
                    try {
                        // Use GET for wsdl probes, POST for SOAP probes
                        const isGet = label.includes("wsdl") || label.includes("get");
                        const r = await fetch(testUrl, isGet ? {
                            method: "GET",
                            headers: { "Authorization": `Basic ${basicAuth()}` },
                        } : {
                            method: "POST",
                            headers: {
                                "Content-Type": "text/xml;charset=UTF-8",
                                "Authorization": `Basic ${basicAuth()}`,
                                "SOAPAction": "http://service.reports.ws.five9.com/runReport",
                                "Accept": "text/xml",
                            },
                            body: probeXml,
                        });
                        const body = await r.text();
                        results[label] = { status: r.status, ok: r.ok, snippet: body.substring(0, 400) };
                    } catch (e: unknown) {
                        results[label] = { error: (e as Error).message };
                    }
                }
                data = results;
                break;
            }
            case "getFolders": {
                // Use the reporting API to try to enumerate folders/reports
                // Five9 Reporting API: getReportFolders (if supported)
                const reportingUrl = url.searchParams.get("url") || "https://api.five9.com/wsreports/v2/ReportingService";
                const foldersXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.reports.ws.five9.com/">
  <soapenv:Body><ser:getReportFolders/></soapenv:Body>
</soapenv:Envelope>`;
                const r = await fetch(reportingUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "text/xml;charset=UTF-8",
                        "Authorization": `Basic ${basicAuth()}`,
                        "SOAPAction": "http://service.reports.ws.five9.com/getReportFolders",
                        "Accept": "text/xml",
                    },
                    body: foldersXml,
                });
                const body = await r.text();
                data = { status: r.status, ok: r.ok, raw: body.substring(0, 3000) };
                break;
            }
            case "runReport": {
                const folderName = url.searchParams.get("folderName") || "Call Log";
                const reportName = url.searchParams.get("reportName") || "Call Log";
                const startDate = url.searchParams.get("startDate");
                const endDate = url.searchParams.get("endDate");
                if (!startDate || !endDate) {
                    return new Response(JSON.stringify({ error: "startDate and endDate are required" }), {
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }
                const startFull = startDate.includes("T") ? startDate : `${startDate}T00:00:00.000`;
                const endFull = endDate.includes("T") ? endDate : `${endDate}T23:59:59.000`;
                // runReport lives on the Admin endpoint (confirmed via WSDL op scan)
                const runXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.admin.ws.five9.com/">
  <soapenv:Body>
    <ser:runReport>
      <folderName>${folderName}</folderName>
      <reportName>${reportName}</reportName>
      <criteria>
        <time>
          <start>${startFull}</start>
          <end>${endFull}</end>
        </time>
      </criteria>
    </ser:runReport>
  </soapenv:Body>
</soapenv:Envelope>`;
                const runRes = await fetch(SOAP_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "text/xml;charset=UTF-8",
                        "Authorization": `Basic ${basicAuth()}`,
                        "SOAPAction": "http://service.admin.ws.five9.com/runReport",
                        "Accept": "text/xml",
                    },
                    body: runXml,
                });
                const runBody = await runRes.text();
                if (!runRes.ok) throw new Error(`Five9 Admin runReport error: ${runRes.status} ${runBody.substring(0, 400)}`);
                const idMatch = runBody.match(/<return[^>]*>([^<]+)<\/return>/);
                if (!idMatch) throw new Error(`Could not parse report identifier: ${runBody.substring(0, 600)}`);
                data = { identifier: idMatch[1], endpoint: SOAP_URL };
                break;
            }
            case "isReportRunning": {
                const identifier = url.searchParams.get("identifier");
                if (!identifier) {
                    return new Response(JSON.stringify({ error: "identifier is required" }), {
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }
                const pollXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.admin.ws.five9.com/">
  <soapenv:Body>
    <ser:isReportRunning>
      <identifier>${identifier}</identifier>
    </ser:isReportRunning>
  </soapenv:Body>
</soapenv:Envelope>`;
                const pollRaw = await fetch(SOAP_URL, {
                    method: "POST",
                    headers: { "Content-Type": "text/xml;charset=UTF-8", "Authorization": `Basic ${basicAuth()}`, "SOAPAction": "http://service.admin.ws.five9.com/isReportRunning", "Accept": "text/xml" },
                    body: pollXml,
                });
                const pollBody = await pollRaw.text();
                if (!pollRaw.ok) throw new Error(`Five9 Admin isReportRunning error: ${pollRaw.status} ${pollBody.substring(0, 200)}`);
                const runningMatch = pollBody.match(/<return[^>]*>(true|false)<\/return>/i);
                data = { running: runningMatch ? runningMatch[1].toLowerCase() === "true" : false };
                break;
            }
            case "getReportCsv": {
                const csvIdentifier = url.searchParams.get("identifier");
                if (!csvIdentifier) {
                    return new Response(JSON.stringify({ error: "identifier is required" }), {
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }
                const csvXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.admin.ws.five9.com/">
  <soapenv:Body>
    <ser:getReportResultCsv>
      <identifier>${csvIdentifier}</identifier>
    </ser:getReportResultCsv>
  </soapenv:Body>
</soapenv:Envelope>`;
                const csvRaw = await fetch(SOAP_URL, {
                    method: "POST",
                    headers: { "Content-Type": "text/xml;charset=UTF-8", "Authorization": `Basic ${basicAuth()}`, "SOAPAction": "http://service.admin.ws.five9.com/getReportResultCsv", "Accept": "text/xml" },
                    body: csvXml,
                });
                const csvRes = await csvRaw.text();
                if (!csvRaw.ok) throw new Error(`Five9 Admin getReportResultCsv error: ${csvRaw.status} ${csvRes.substring(0, 200)}`);
                const csvMatch = csvRes.match(/<return[^>]*>([\s\S]*?)<\/return>/i);
                const csv = csvMatch
                    ? csvMatch[1]
                        .replace(/&amp;/g, "&")
                        .replace(/&lt;/g, "<")
                        .replace(/&gt;/g, ">")
                        .replace(/&quot;/g, '"')
                        .replace(/&#xd;/gi, "")
                    : "";
                data = { csv };
                break;
            }
            case "runAndGetReport": {
                // Run report + poll until done + return CSV — all in one edge-function call
                // so the Five9 identifier stays in the same SOAP session context
                const rFolder = url.searchParams.get("folderName") || "Campaign Reports";
                const rReport = url.searchParams.get("reportName") || "Campaign Activity";
                const rStart  = url.searchParams.get("startDate");
                const rEnd    = url.searchParams.get("endDate");
                if (!rStart || !rEnd) {
                    return new Response(JSON.stringify({ error: "startDate and endDate are required" }), {
                        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }
                const rStartFull = rStart.includes("T") ? rStart : `${rStart}T00:00:00.000`;
                const rEndFull   = rEnd.includes("T")   ? rEnd   : `${rEnd}T23:59:59.000`;
                const NS = "http://service.admin.ws.five9.com/";
                let sessionCookie = "";
                const makeSoap = (body: string, op: string) => fetch(SOAP_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "text/xml;charset=UTF-8",
                        "Authorization": `Basic ${basicAuth()}`,
                        "SOAPAction": `${NS}${op}`,
                        "Accept": "text/xml",
                        ...(sessionCookie ? { "Cookie": sessionCookie } : {}),
                    },
                    body,
                });
                // Step 1: runReport
                const runXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.admin.ws.five9.com/">
  <soapenv:Body>
    <ser:runReport>
      <folderName>${rFolder}</folderName>
      <reportName>${rReport}</reportName>
      <criteria><time><start>${rStartFull}</start><end>${rEndFull}</end></time></criteria>
    </ser:runReport>
  </soapenv:Body>
</soapenv:Envelope>`;
                const runRes = await makeSoap(runXml, "runReport");
                // Capture ALL response headers for diagnostics
                const allHeaders: Record<string, string> = {};
                const allCookies: string[] = [];
                runRes.headers.forEach((v, k) => {
                    allHeaders[k] = v;  // last wins for dupes (ok for diagnostics)
                    if (k.toLowerCase() === "set-cookie") {
                        // Extract just the name=value part (before first ";")
                        const nameVal = v.split(";")[0].trim();
                        if (nameVal) allCookies.push(nameVal);
                    }
                });
                // Also try getSetCookie() if available (Deno 1.39+)
                if ("getSetCookie" in runRes.headers) {
                    const setCookies = (runRes.headers as unknown as { getSetCookie(): string[] }).getSetCookie();
                    for (const sc of setCookies) {
                        const nameVal = sc.split(";")[0].trim();
                        if (nameVal && !allCookies.includes(nameVal)) allCookies.push(nameVal);
                    }
                }
                sessionCookie = allCookies.join("; ");
                const runBody = await runRes.text();
                if (!runRes.ok) throw new Error(`runReport failed: ${runRes.status} ${runBody.substring(0, 400)}`);
                const idM = runBody.match(/<return[^>]*>([^<]+)<\/return>/);
                if (!idM) throw new Error(`No identifier in runReport response: ${runBody.substring(0, 400)}`);
                const reportId = idM[1];
                console.log('runReport identifier:', JSON.stringify(reportId));
                // Step 2: poll isReportRunning (max 10 attempts × 2s = 20s)
                let running = true;
                let attempts = 0;
                let pollErrors: string[] = [];
                let pollRaw1 = "";
                while (running && attempts < 10) {
                    await new Promise(r => setTimeout(r, 2000));
                    attempts++;
                    const pollXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.admin.ws.five9.com/">
  <soapenv:Body><ser:isReportRunning><identifier>${reportId}</identifier></ser:isReportRunning></soapenv:Body>
</soapenv:Envelope>`;
                    const pollRes = await makeSoap(pollXml, "isReportRunning");
                    const pollBody = await pollRes.text();
                    if (attempts === 1) pollRaw1 = pollBody.substring(0, 500);
                    if (!pollRes.ok) {
                        pollErrors.push(`attempt ${attempts}: HTTP${pollRes.status}`);
                        if (attempts >= 3) { running = false; break; }
                        continue;
                    }
                    const runningM = pollBody.match(/<return[^>]*>(true|false)<\/return>/i);
                    running = runningM ? runningM[1].toLowerCase() === "true" : false;
                }
                // Step 3: try getReportResult first (non-CSV, simpler format), then CSV
                const csvXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.admin.ws.five9.com/">
  <soapenv:Body><ser:getReportResultCsv><identifier>${reportId}</identifier></ser:getReportResultCsv></soapenv:Body>
</soapenv:Envelope>`;
                const csvRes = await makeSoap(csvXml, "getReportResultCsv");
                const csvBodyRaw = await csvRes.text();
                // Also try non-CSV variant for diagnostics
                const resultXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.admin.ws.five9.com/">
  <soapenv:Body><ser:getReportResult><identifier>${reportId}</identifier></ser:getReportResult></soapenv:Body>
</soapenv:Envelope>`;
                const resultRes = await makeSoap(resultXml, "getReportResult");
                const resultBodyRaw = await resultRes.text();
                // Return diagnostic info
                const sessionCookieUsed = sessionCookie;
                if (!csvRes.ok && !resultRes.ok) {
                    throw new Error(`Both CSV and result fetch failed. identifier=${reportId} cookie=${sessionCookieUsed} pollRaw1=${pollRaw1} pollErrors=${JSON.stringify(pollErrors)} csvErr=${csvBodyRaw.substring(0, 400)} resultErr=${resultBodyRaw.substring(0, 400)}`);
                }
                const bodyToUse = csvRes.ok ? csvBodyRaw : resultBodyRaw;
                const csvRes2 = csvRes; // rename to avoid conflict below
                const csvM = bodyToUse.match(/<return[^>]*>([\s\S]*?)<\/return>/i);
                const csv = csvM
                    ? csvM[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#xd;/gi, "")
                    : "";
                data = {
                    identifier: reportId,
                    session_cookie: sessionCookieUsed || null,
                    poll_attempts: attempts,
                    poll_errors: pollErrors,
                    csv_ok: csvRes2.ok,
                    result_ok: resultRes.ok,
                    csv,
                    csv_rows: csv.split("\n").length - 1,
                    csv_preview: csv.substring(0, 800),
                    raw_result_snippet: resultBodyRaw.substring(0, 400),
                    raw_csv_snippet: csvBodyRaw.substring(0, 400),
                };
                break;
            }
            case "diagReport": {
                const diagId = url.searchParams.get("identifier");
                if (!diagId) return new Response(JSON.stringify({ error: "identifier required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
                const diagResults: Record<string, unknown> = {};
                // Test every possible variant
                const variants: Array<{ label: string; xml: string; op: string }> = [
                    { label: "getCsv-lower", op: "getReportResultCsv",
                      xml: `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.admin.ws.five9.com/"><soapenv:Body><ser:getReportResultCsv><identifier>${diagId}</identifier></ser:getReportResultCsv></soapenv:Body></soapenv:Envelope>` },
                    { label: "getCsv-upper", op: "getReportResultCSV",
                      xml: `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.admin.ws.five9.com/"><soapenv:Body><ser:getReportResultCSV><identifier>${diagId}</identifier></ser:getReportResultCSV></soapenv:Body></soapenv:Envelope>` },
                    { label: "getResult", op: "getReportResult",
                      xml: `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.admin.ws.five9.com/"><soapenv:Body><ser:getReportResult><identifier>${diagId}</identifier></ser:getReportResult></soapenv:Body></soapenv:Envelope>` },
                    { label: "isRunning", op: "isReportRunning",
                      xml: `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.admin.ws.five9.com/"><soapenv:Body><ser:isReportRunning><identifier>${diagId}</identifier></ser:isReportRunning></soapenv:Body></soapenv:Envelope>` },
                    // Try with CDATA wrapping for the identifier
                    { label: "getCsv-cdata", op: "getReportResultCsv",
                      xml: `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.admin.ws.five9.com/"><soapenv:Body><ser:getReportResultCsv><identifier><![CDATA[${diagId}]]></identifier></ser:getReportResultCsv></soapenv:Body></soapenv:Envelope>` },
                ];
                for (const { label, xml, op } of variants) {
                    try {
                        const r = await fetch(SOAP_URL, {
                            method: "POST",
                            headers: { "Content-Type": "text/xml;charset=UTF-8", "Authorization": `Basic ${basicAuth()}`, "SOAPAction": `http://service.admin.ws.five9.com/${op}`, "Accept": "text/xml" },
                            body: xml,
                        });
                        const b = await r.text();
                        diagResults[label] = { status: r.status, ok: r.ok, snippet: b.substring(0, 300) };
                    } catch(e: unknown) { diagResults[label] = { error: (e as Error).message }; }
                }
                data = diagResults;
                break;
            }
            case "adminRunReportProbe": {
                // Try multiple folder/report name combos on the Admin endpoint to find a valid one
                const probeStart = url.searchParams.get("startDate") || "2026-05-01";
                const probeEnd = url.searchParams.get("endDate") || "2026-05-31";
                const combos = [
                    // Five9 known standard report folders
                    { folder: "Agent Reports", report: "Call Log" },
                    { folder: "Agent Reports", report: "Daily Call Log" },
                    { folder: "Agent Reports", report: "Calls by Agent" },
                    { folder: "Contact History", report: "Outbound Contact History" },
                    { folder: "Contact History", report: "Contact History" },
                    { folder: "Contact History", report: "Call Log" },
                    { folder: "Activity Reports", report: "Call Log" },
                    { folder: "Activity Reports", report: "Daily Activity" },
                    { folder: "Campaign Reports", report: "Campaign Call Log" },
                    { folder: "Campaign Reports", report: "Campaign Activity" },
                    { folder: "Campaign Reports", report: "24H Virtual Outreach US" },
                    { folder: "DNIS Reports", report: "Call Log" },
                    { folder: "Skill Reports", report: "Call Log" },
                    // Try the exact campaign name as both folder and report
                    { folder: "24H Virtual Outreach US", report: "Call Log" },
                    { folder: "24H Virtual Outreach US", report: "24H Virtual Outreach US" },
                    // Custom/shared folders
                    { folder: "Shared Reports", report: "Call Log" },
                    { folder: "Custom Reports", report: "Call Log" },
                    { folder: "IVR Reports", report: "Call Log" },
                    { folder: "Reporting", report: "Call Log" },
                    { folder: "Reports", report: "Call Log" },
                ];
                const probeResults: Array<{ folder: string; report: string; status: number; ok: boolean; snippet: string }> = [];
                for (const combo of combos) {
                    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.admin.ws.five9.com/">
  <soapenv:Body>
    <ser:runReport>
      <folderName>${combo.folder}</folderName>
      <reportName>${combo.report}</reportName>
      <criteria><time><start>${probeStart}T00:00:00.000</start><end>${probeEnd}T23:59:59.000</end></time></criteria>
    </ser:runReport>
  </soapenv:Body>
</soapenv:Envelope>`;
                    try {
                        const r = await fetch(SOAP_URL, {
                            method: "POST",
                            headers: { "Content-Type": "text/xml;charset=UTF-8", "Authorization": `Basic ${basicAuth()}`, "SOAPAction": "http://service.admin.ws.five9.com/runReport", "Accept": "text/xml" },
                            body: xml,
                        });
                        const body = await r.text();
                        probeResults.push({ ...combo, status: r.status, ok: r.ok, snippet: body.substring(0, 300) });
                    } catch (e: unknown) {
                        probeResults.push({ ...combo, status: 0, ok: false, snippet: (e as Error).message });
                    }
                }
                data = probeResults;
                break;
            }
            default:
                return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
        }

        return new Response(JSON.stringify({ data }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});