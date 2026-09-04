/**
 * Assign a Five9 Connector to all active Inbound campaigns.
 *
 * ============================================================================
 * IMPORTANT — READ BEFORE USING
 * ============================================================================
 * Five9's public Admin SOAP API (v13, AdminWebService) has NO operation to
 * link a Connector to a Campaign. This was confirmed by inspecting the WSDL
 * (https://api.five9.com/wsadmin/v13/AdminWebService?wsdl):
 *
 *   - The `webConnector` complexType (used by createWebConnector /
 *     modifyWebConnector / getWebConnectors) has no field referencing a
 *     campaign — no `campaigns`, `campaignName`, etc.
 *   - The `campaign` / `generalCampaign` / `inboundCampaign` complexTypes
 *     have no field referencing a connector — no `connectors`,
 *     `webConnectors`, etc.
 *   - Five9 DOES expose a documented "add <X> to campaign" pattern for other
 *     resource types (addDNISToCampaign, addDispositionsToCampaign,
 *     addListsToCampaign, addSkillsToCampaign, removeSkillsFromCampaign,
 *     removeListsFromCampaign, removeDispositionsFromCampaign,
 *     removeDNISFromCampaign) — but there is no addConnectorsToCampaign /
 *     addWebConnectorToCampaign counterpart anywhere in the schema.
 *
 * The "Active Connector(s)" Add/Remove list you see in the legacy VCC
 * Administrator Java client (Campaigns > [campaign] > Connectors tab) is
 * therefore backed by something other than the public AdminWebService SOAP
 * API — most likely an internal/legacy protocol the thick client uses that
 * Five9 has not published. There is no supported way to drive it over HTTP
 * from this script.
 *
 * WHAT THIS SCRIPT DOES INSTEAD
 * ------------------------------
 * It automates the one part of this job that *is* possible via the public
 * API — discovering exactly which campaigns need the connector — so that the
 * only manual step left is clicking "Add" in the UI for each one:
 *
 *   1. Authenticates to the Five9 Admin SOAP API with TechTeam credentials.
 *   2. Calls getCampaigns and filters to campaigns where type is Inbound
 *      and state indicates the campaign is running/active.
 *   3. Prints the full list (name + state) as your manual work queue, and
 *      optionally writes it to a CSV file for tracking progress.
 *
 * The `assignConnectorToCampaign` function below is left in as a documented
 * stub — call it once Five9 Support/Professional Services confirms an actual
 * method or endpoint for this, and wire in the real SOAP call.
 *
 * USAGE
 * -----
 *   export FIVE9_USERNAME=TechTeam
 *   export FIVE9_PASSWORD=<the real Five9 password — never commit this>
 *   npx tsx scripts/assign-five9-connector.ts
 *
 * Optional:
 *   npx tsx scripts/assign-five9-connector.ts --csv=out/inbound-campaigns.csv
 * ============================================================================
 */

const FIVE9_USERNAME = process.env.FIVE9_USERNAME ?? "";
const FIVE9_PASSWORD = process.env.FIVE9_PASSWORD ?? "";

const CONNECTOR_ID = 120020;
const CONNECTOR_NAME = "24H Virtual - Call Ingest";

const SOAP_URL = `https://api.five9.com/wsadmin/v13/AdminWebService?user=${encodeURIComponent(FIVE9_USERNAME)}`;
const SOAP_NS = "http://service.admin.ws.five9.com/";

interface Campaign {
    name: string;
    type: string;
    state: string;
    description: string;
}

interface AssignmentResult {
    campaign: string;
    success: boolean;
    message: string;
}

function basicAuthHeader(): string {
    return `Basic ${Buffer.from(`${FIVE9_USERNAME}:${FIVE9_PASSWORD}`).toString("base64")}`;
}

async function soapRequest(body: string, action: string): Promise<string> {
    const res = await fetch(SOAP_URL, {
        method: "POST",
        headers: {
            "Content-Type": "text/xml;charset=UTF-8",
            "Authorization": basicAuthHeader(),
            "SOAPAction": `${SOAP_NS}${action}`,
            "Accept": "text/xml",
        },
        body,
    });
    const text = await res.text();
    if (!res.ok) {
        throw new Error(`Five9 SOAP error (${action}): HTTP ${res.status} — ${text.substring(0, 500)}`);
    }
    if (text.includes("<soapenv:Fault") || text.includes("<soap:Fault") || text.includes("faultstring")) {
        throw new Error(`Five9 SOAP fault (${action}): ${text.substring(0, 500)}`);
    }
    return text;
}

/** Same lightweight extraction pattern used by supabase/functions/five9-proxy/index.ts */
function parseXmlObjects(xml: string, wrapperTag: string, fields: string[]): Record<string, string>[] {
    const items: Record<string, string>[] = [];
    const wrapperRegex = new RegExp(`<${wrapperTag}[^>]*>([\\s\\S]*?)<\\/${wrapperTag}>`, "g");
    let wrapper: RegExpExecArray | null;
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

async function getAllCampaigns(): Promise<Campaign[]> {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="${SOAP_NS}">
  <soapenv:Body><ser:getCampaigns><campaignNamePattern>.*</campaignNamePattern></ser:getCampaigns></soapenv:Body>
</soapenv:Envelope>`;

    const response = await soapRequest(xml, "getCampaigns");
    const raw = parseXmlObjects(response, "return", ["name", "type", "state", "description"]);
    return raw.map((c) => ({
        name: c.name,
        type: c.type,
        state: c.state,
        description: c.description,
    }));
}

function isActiveInbound(c: Campaign): boolean {
    const type = c.type.toLowerCase();
    const state = c.state.toLowerCase();
    const isInbound = type.includes("inbound") && !type.includes("outbound");
    const isRunning = state.includes("run") && !state.includes("not");
    return isInbound && isRunning;
}

/**
 * STUB — no confirmed Five9 API exists for this operation (see header comment).
 * Wire in the real SOAP call here if/when Five9 Support confirms one.
 */
async function assignConnectorToCampaign(campaignName: string): Promise<AssignmentResult> {
    return {
        campaign: campaignName,
        success: false,
        message:
            "NOT AUTOMATED — no addConnectorsToCampaign-style operation exists in the " +
            "Five9 v13 AdminWebService WSDL. Assign manually via VCC Administrator > " +
            "Campaigns > [campaign] > Connectors tab > Add > " +
            `${CONNECTOR_NAME} (ID ${CONNECTOR_ID}) > Save.`,
    };
}

function toCsv(campaigns: Campaign[]): string {
    const header = "name,type,state,description";
    const rows = campaigns.map((c) =>
        [c.name, c.type, c.state, c.description]
            .map((v) => `"${(v ?? "").replace(/"/g, '""')}"`)
            .join(","),
    );
    return [header, ...rows].join("\n");
}

async function main() {
    if (!FIVE9_USERNAME || !FIVE9_PASSWORD) {
        console.error(
            "Missing FIVE9_USERNAME / FIVE9_PASSWORD environment variables.\n" +
            "  export FIVE9_USERNAME=TechTeam\n" +
            "  export FIVE9_PASSWORD=<five9 password>",
        );
        process.exit(1);
    }

    const csvArg = process.argv.find((a) => a.startsWith("--csv="));
    const csvPath = csvArg?.split("=")[1];

    console.log(`Connecting to Five9 Admin API as ${FIVE9_USERNAME}...`);
    const allCampaigns = await getAllCampaigns();
    console.log(`Fetched ${allCampaigns.length} total campaigns.\n`);

    const activeInbound = allCampaigns.filter(isActiveInbound);
    console.log(`Active Inbound campaigns: ${activeInbound.length}\n`);

    console.log(`Target connector: "${CONNECTOR_NAME}" (ID ${CONNECTOR_ID})\n`);
    console.log("=".repeat(80));
    console.log(
        "NOTE: Five9's public SOAP Admin API has no method to assign a connector to a\n" +
        "campaign (confirmed via WSDL inspection — see header comment in this file).\n" +
        "The per-campaign results below reflect that; this run does NOT modify any\n" +
        "campaign. Use this list as your manual work queue in the VCC Administrator UI.",
    );
    console.log("=".repeat(80) + "\n");

    const results: AssignmentResult[] = [];
    for (const campaign of activeInbound) {
        const result = await assignConnectorToCampaign(campaign.name);
        results.push(result);
        console.log(`[${result.success ? "OK" : "SKIP"}] ${campaign.name} (state: ${campaign.state})`);
    }

    console.log(`\n${results.length} campaigns require manual connector assignment.`);

    if (csvPath) {
        const fs = await import("node:fs/promises");
        await fs.writeFile(csvPath, toCsv(activeInbound), "utf-8");
        console.log(`\nWrote work queue to ${csvPath}`);
    }
}

main().catch((err) => {
    console.error("Fatal error:", err instanceof Error ? err.message : err);
    process.exit(1);
});
