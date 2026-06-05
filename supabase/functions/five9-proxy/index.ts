import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const FIVE9_USERNAME = Deno.env.get("FIVE9_USERNAME") ?? "";
const FIVE9_PASSWORD = Deno.env.get("FIVE9_PASSWORD") ?? "";

const SOAP_URL = `https://api.five9.com/wsadmin/v13/AdminWebService?user=${encodeURIComponent(FIVE9_USERNAME)}`;

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

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.admin.ws.five9.com/">
  <soapenv:Body><ser:getUsers><userNamePattern>.*</userNamePattern></ser:getUsers></soapenv:Body>
</soapenv:Envelope>`;

    const response = await soapRequest(xml, "getUsers");
    const users = parseXmlObjects(response, "return", ["userName", "firstName", "lastName", "email", "active", "extension"]);
    if (users.length === 0) return { raw: response.substring(0, 3000), users };
    setCache("users", users, 300);
    return users;
}

async function getCampaigns() {
    const cached = getCached("campaigns");
    if (cached) return cached;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.admin.ws.five9.com/">
  <soapenv:Body><ser:getCampaigns><namePattern>.*</namePattern></ser:getCampaigns></soapenv:Body>
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

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.admin.ws.five9.com/">
  <soapenv:Body><ser:getSkills><namePattern>.*</namePattern></ser:getSkills></soapenv:Body>
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

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.admin.ws.five9.com/">
  <soapenv:Body><ser:getDispositions><namePattern>.*</namePattern></ser:getDispositions></soapenv:Body>
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
                const testUrl = `https://api.five9.com/wsadmin/v12/AdminWebService?user=${encodeURIComponent(FIVE9_USERNAME)}`;
                const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.admin.ws.five9.com/">
  <soapenv:Body><ser:getApiVersions/></soapenv:Body>
</soapenv:Envelope>`;
                const testRes = await fetch(testUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "text/xml;charset=UTF-8",
                        "Authorization": `Basic ${btoa(FIVE9_USERNAME + ":" + FIVE9_PASSWORD)}`,
                        "SOAPAction": "http://service.admin.ws.five9.com/getApiVersions",
                    },
                    body: testXml,
                });
                data = { status: testRes.status, body: await testRes.text(), username: FIVE9_USERNAME, url: testUrl };
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