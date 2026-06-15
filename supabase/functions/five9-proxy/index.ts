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
                    raw_error: testRes.ok ? null : testBody,
                };
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
                const runXml = `<?xml version="1.0" encoding="UTF-8"?>
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
                const runRes = await soapReportRequest(runXml, "runReport");
                const idMatch = runRes.match(/<return[^>]*>(\d+)<\/return>/);
                if (!idMatch) throw new Error(`Could not parse report identifier: ${runRes.substring(0, 400)}`);
                data = { identifier: idMatch[1] };
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
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.reports.ws.five9.com/">
  <soapenv:Body>
    <ser:isReportRunning>
      <identifier>${identifier}</identifier>
    </ser:isReportRunning>
  </soapenv:Body>
</soapenv:Envelope>`;
                const pollRes = await soapReportRequest(pollXml, "isReportRunning");
                const runningMatch = pollRes.match(/<return[^>]*>(true|false)<\/return>/i);
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
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.reports.ws.five9.com/">
  <soapenv:Body>
    <ser:getReportResultCSV>
      <identifier>${csvIdentifier}</identifier>
    </ser:getReportResultCSV>
  </soapenv:Body>
</soapenv:Envelope>`;
                const csvRes = await soapReportRequest(csvXml, "getReportResultCSV");
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