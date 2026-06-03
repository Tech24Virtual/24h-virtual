import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  TrendingUp, Headphones, Layers, ArrowRight,
  Database, Route, Zap, AlertTriangle, Globe, Shield,
  Search, X, ChevronDown,
} from "lucide-react";

/* ── Layer colour classes (semantic tokens) ────────────────────── */
const layerStyles = {
  growth: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  delivery: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-600 dark:text-blue-400", badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  platform: { bg: "bg-violet-500/10", border: "border-violet-500/30", text: "text-violet-600 dark:text-violet-400", badge: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30" },
};

/* ── Data ───────────────────────────────────────────────────────── */
interface LayerDef {
  key: "growth" | "delivery" | "platform";
  title: string;
  subtitle: string;
  icon: typeof TrendingUp;
  purpose: string;
  routes: string[];
  tables: string[];
  edgeFunctions: string[];
}

const layers: LayerDef[] = [
  {
    key: "growth",
    title: "Front-End Growth Layer",
    subtitle: "Revenue Generation",
    icon: TrendingUp,
    purpose: "Drives traffic, captures interest, and feeds attributed leads into the CRM pipeline.",
    routes: [
      "/", "/get-started", "/pricing", "/services/*", "/industries/*", "/locations/*",
      "/roi-calculator", "/launch-estimator", "/call-flow-builder",
      "/blog", "/blog/:slug", "/gpt-advisor",
      "/admin/growth-hub", "/admin/growth-hub/*", "/admin/blog", "/admin/blog/editor",
      "/admin/keywords",
    ],
    tables: [
      "blog_posts", "keyword_tracker", "autoblog_queue", "blog_internal_links",
      "admin_newsletter_drafts", "admin_email_contacts", "admin_email_sends",
      "admin_email_connections", "admin_seo_reports", "admin_social_snippets",
      "admin_wordpress_connection",
    ],
    edgeFunctions: [
      "generate-blog-post", "publish-to-wordpress", "import-wordpress-posts",
      "enrich-blog-posts", "fix-blog-content", "autoblog-batch",
      "admin-generate-newsletter", "admin-generate-seo-report",
      "admin-generate-social-snippets", "send-exit-intent-email",
      "chat", "call-advisor",
    ],
  },
  {
    key: "delivery",
    title: "Service Delivery Layer",
    subtitle: "Value Delivery",
    icon: Headphones,
    purpose: "Answers calls, handles customers, coordinates the team, and keeps SLAs and outcomes on track.",
    routes: [
      "/admin/leads", "/admin/leads/:id", "/admin/clients", "/admin/crm",
      "/admin/outbound-calls", "/admin/tickets", "/admin/tickets/:id",
      "/staff/agent/*", "/staff/supervisor/*", "/staff/sales/*",
      "/staff/billing/*", "/staff/tech-support/*", "/hr-portal/*",
    ],
    tables: [
      "leads", "lead_conversions", "crm_activities", "crm_tasks",
      "call_logs", "call_report_imports", "client_report_mappings",
      "client_scripts", "client_addons", "client_agent_assignments", "client_quick_links",
      "agent_shifts", "agent_shift_breaks", "agent_schedules", "agent_skills",
      "agent_banking", "agent_onboarding", "agent_onboarding_log", "agent_performance_reviews",
      "meetings", "email_followups", "billing_notes", "custom_plans",
      "contracts", "job_postings", "job_applications",
      "feedback", "hr_communications",
    ],
    edgeFunctions: [
      "ingest-five9-call", "ingest-call-report", "ingest-meeting",
      "ingest-outbound-request", "trigger-post-call-notification",
      "ai-lead-insights", "onboarding-assistant", "support-assistant",
      "send-ticket-notification", "send-admin-notification",
      "create-client", "invite-user",
      "slack-events", "slack-invite", "slack-send", "slack-sync", "slack-workspace-invite",
    ],
  },
  {
    key: "platform",
    title: "Platform & Partner Layer",
    subtitle: "Leverage & Scale",
    icon: Layers,
    purpose: "Lets 24H grow through partners, automation, and multi-tenant architecture instead of linear headcount.",
    routes: [
      "/admin", "/admin/users", "/admin/partners", "/admin/partners/:id",
      "/admin/billing", "/admin/agents", "/admin/analytics", "/admin/settings",
      "/admin/outline", "/admin/architecture",
      "/partner/*", "/portal/:slug/*", "/affiliate/*",
    ],
    tables: [
      "profiles", "user_roles", "notifications",
      "white_label_partners", "white_label_clients", "white_label_branding",
      "wl_blog_queue", "wl_keyword_tracker", "wl_newsletter_drafts",
      "wl_seo_reports", "wl_social_snippets", "wl_wordpress_connections",
      "wl_knowledge_base", "wl_email_connections",
      "affiliates", "affiliate_referrals", "affiliate_payouts", "affiliate_marketing_assets",
      "addon_products", "admin_settings",
      "sales_commissions", "support_tickets", "support_ticket_replies",
      "open_shifts", "time_off_requests", "outbound_call_requests",
    ],
    edgeFunctions: [
      "stripe-webhook", "create-checkout", "check-subscription",
      "create-custom-plan", "create-invoice", "customer-portal",
      "link-stripe-customer", "manage-subscription-addons",
      "send-payment-link", "send-card-update-link",
      "calculate-monthly-billing", "calculate-wl-usage", "report-usage",
      "process-agent-payout",
      "verify-wl-cname",
      "wl-generate-blog-post", "wl-generate-newsletter", "wl-generate-seo-report",
      "wl-generate-social-snippets", "wl-send-newsletter",
      "wl-suggest-keywords", "wl-test-email-connection", "wl-test-wp-connection",
      "provision-demo-account", "delete-demo-account",
    ],
  },
];

/* ── Cross-Layer Dependencies ──────────────────────────────────── */
interface CrossDep {
  name: string;
  from: string;
  to: string;
  description: string;
  ownership: string;
  type: "data-flow" | "dual-role" | "shared-concept" | "trigger";
}

const crossDeps: CrossDep[] = [
  { name: "Lead Form → CRM Pipeline", from: "Growth", to: "Delivery", description: "Lead forms (Growth) insert into the leads table consumed by CRM pipeline (Delivery). UTM attribution data flows with the lead.", ownership: "Growth owns capture; Delivery owns lifecycle.", type: "data-flow" },
  { name: "Growth Hub — Admin vs WL", from: "Growth", to: "Platform", description: "The Growth Hub concept exists in both layers but operates on entirely separate data stores. Admin uses blog_posts, keyword_tracker, etc. WL partners use wl_blog_queue, wl_keyword_tracker, etc.", ownership: "Growth owns admin content engine; Platform owns WL tenant isolation.", type: "shared-concept" },
  { name: "Sales Portal — Dual Layer Role", from: "Delivery", to: "Platform", description: "The Sales Portal lives in Service Delivery (pipeline, meetings, proposals) but sales commissions touch Platform (billing reconciliation, payout processing).", ownership: "Delivery owns pipeline & proposals; Platform owns commission calculation & payouts.", type: "dual-role" },
  { name: "CRM Attribution ← UTM Tracking", from: "Growth", to: "Delivery", description: "CRM attribution data (source, medium, campaign) is captured in Growth and consumed read-only by Delivery for pipeline analytics.", ownership: "Growth owns capture; Delivery consumes read-only.", type: "data-flow" },
  { name: "Five9 Ingestion → Call Logs → Billing", from: "Delivery", to: "Platform", description: "Five9 call data is ingested in Delivery (call_logs), then aggregated by Platform for billing calculations (calculate-monthly-billing, calculate-wl-usage).", ownership: "Delivery owns call records; Platform owns billing aggregation.", type: "data-flow" },
  { name: "Calendly → Meetings → Sales", from: "Growth", to: "Delivery", description: "Calendly booking widget (Growth) triggers ingest-meeting (Delivery) which creates meeting records linked to leads and the sales pipeline.", ownership: "Growth owns booking UX; Delivery owns meeting records.", type: "trigger" },
  { name: "WL Client Portals ← Client Scripts", from: "Delivery", to: "Platform", description: "Client scripts and call handling rules are authored in Delivery but surfaced in WL client portals (Platform) for partner-branded agent access.", ownership: "Delivery owns script content; Platform owns portal presentation.", type: "data-flow" },
  { name: "RBAC/RLS — Universal Foundation", from: "Platform", to: "All Layers", description: "The 10-role RBAC system and has_role() security definer function are defined in Platform but enforced across all tables in every layer.", ownership: "Platform owns role definitions; all layers consume via RLS policies.", type: "shared-concept" },
  { name: "Notifications — Cross-Layer Events", from: "Platform", to: "All Layers", description: "The notifications table lives in Platform but receives inserts from triggers across Delivery (task events, shift edits, time-off) and Growth (new leads).", ownership: "Platform owns notification infrastructure; triggers are authored per-layer.", type: "trigger" },
  { name: "HR Portal — Delivery + Platform", from: "Delivery", to: "Platform", description: "HR Portal is in Delivery (hiring, onboarding, contracts) but payroll processing uses Airwallex in Platform. Agent banking data bridges both.", ownership: "Delivery owns HR workflows; Platform owns payout execution.", type: "dual-role" },
  { name: "Stripe Billing ← Custom Plans", from: "Delivery", to: "Platform", description: "Custom plans are configured per-client in Delivery (custom_plans table) but synced to Stripe products/prices in Platform for subscription management.", ownership: "Delivery owns plan configuration; Platform owns Stripe sync & dunning.", type: "data-flow" },
  { name: "Report Mappings — Delivery ↔ Platform", from: "Delivery", to: "Platform", description: "client_report_mappings maps DNIS/campaigns to clients (Delivery) and optionally to WL partners (Platform) for multi-tenant call routing.", ownership: "Delivery owns mapping logic; Platform extends for partner scoping.", type: "dual-role" },
];

const depTypeBadge: Record<CrossDep["type"], string> = {
  "data-flow": "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  "dual-role": "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  "shared-concept": "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  "trigger": "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
};

/* ── Flow Diagram Data ─────────────────────────────────────────── */
const flowArrows = [
  { from: "Growth", to: "Delivery", labels: ["Leads", "UTM", "Calendly"] },
  { from: "Growth", to: "Platform", labels: ["Content Tenancy"] },
  { from: "Delivery", to: "Platform", labels: ["Call Data", "Commissions", "Scripts"] },
  { from: "Platform", to: "All", labels: ["RBAC", "Notifications"] },
];

/* ── Helpers ────────────────────────────────────────────────────── */
function matchesSearch(query: string, ...fields: string[]): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return fields.some((f) => f.toLowerCase().includes(q));
}

/* ── Component ──────────────────────────────────────────────────── */
export default function AdminArchitecture() {
  const [search, setSearch] = useState("");

  const filteredLayers = useMemo(
    () =>
      layers.map((layer) => ({
        ...layer,
        visible: matchesSearch(search, layer.title, layer.subtitle, layer.purpose, ...layer.routes, ...layer.tables, ...layer.edgeFunctions),
        filteredRoutes: layer.routes.filter((r) => matchesSearch(search, r)),
        filteredTables: layer.tables.filter((t) => matchesSearch(search, t)),
        filteredFunctions: layer.edgeFunctions.filter((f) => matchesSearch(search, f)),
      })),
    [search],
  );

  const filteredDeps = useMemo(
    () => crossDeps.filter((d) => matchesSearch(search, d.name, d.description, d.from, d.to, d.ownership)),
    [search],
  );

  return (
    <div className="space-y-8 max-w-7xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Architecture</h1>
          <p className="text-muted-foreground mt-1">
            Three-layer source-of-truth map — routes, tables, edge functions, and cross-layer dependencies.
          </p>
        </div>

        {/* ── Search Bar ─────────────────────────────────────── */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search routes, tables, functions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Visual Layer Overview ───────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredLayers.filter((l) => l.visible).map((layer) => {
            const s = layerStyles[layer.key];
            const Icon = layer.icon;
            return (
              <Card key={layer.key} className={`${s.bg} ${s.border} border`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${s.bg}`}>
                      <Icon className={`w-5 h-5 ${s.text}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{layer.title}</CardTitle>
                      <p className={`text-xs font-medium ${s.text}`}>{layer.subtitle}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">{layer.purpose}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-background/60 rounded-md p-2">
                      <Route className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="font-semibold">{layer.routes.length}</p>
                      <p className="text-[10px] text-muted-foreground">Routes</p>
                    </div>
                    <div className="bg-background/60 rounded-md p-2">
                      <Database className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="font-semibold">{layer.tables.length}</p>
                      <p className="text-[10px] text-muted-foreground">Tables</p>
                    </div>
                    <div className="bg-background/60 rounded-md p-2">
                      <Zap className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="font-semibold">{layer.edgeFunctions.length}</p>
                      <p className="text-[10px] text-muted-foreground">Functions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ── CSS Flow Diagram ───────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="w-5 h-5 text-primary" />
              Data Flow Between Layers
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              How data moves across the three architectural layers.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 lg:gap-0 justify-center py-4">
              {/* Growth Box */}
              <div className="flex flex-col items-center">
                <div className={`rounded-xl border-2 border-emerald-500/40 bg-emerald-500/10 px-6 py-4 text-center min-w-[160px]`}>
                  <TrendingUp className="w-6 h-6 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
                  <p className="font-semibold text-sm">Growth</p>
                  <p className="text-[10px] text-muted-foreground">Revenue Generation</p>
                </div>
              </div>

              {/* Arrow Growth → Delivery */}
              <div className="flex flex-col items-center justify-center lg:mt-4 min-w-[140px]">
                <div className="flex items-center gap-1">
                  <div className="h-px w-8 bg-border hidden lg:block" />
                  <ArrowRight className="w-4 h-4 text-muted-foreground hidden lg:block" />
                  <ChevronDown className="w-4 h-4 text-muted-foreground lg:hidden" />
                </div>
                <div className="flex flex-wrap gap-1 justify-center mt-1">
                  {flowArrows[0].labels.map((l) => (
                    <span key={l} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">{l}</span>
                  ))}
                </div>
              </div>

              {/* Delivery Box */}
              <div className="flex flex-col items-center">
                <div className={`rounded-xl border-2 border-blue-500/40 bg-blue-500/10 px-6 py-4 text-center min-w-[160px]`}>
                  <Headphones className="w-6 h-6 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
                  <p className="font-semibold text-sm">Delivery</p>
                  <p className="text-[10px] text-muted-foreground">Value Delivery</p>
                </div>
              </div>

              {/* Arrow Delivery → Platform */}
              <div className="flex flex-col items-center justify-center lg:mt-4 min-w-[140px]">
                <div className="flex items-center gap-1">
                  <div className="h-px w-8 bg-border hidden lg:block" />
                  <ArrowRight className="w-4 h-4 text-muted-foreground hidden lg:block" />
                  <ChevronDown className="w-4 h-4 text-muted-foreground lg:hidden" />
                </div>
                <div className="flex flex-wrap gap-1 justify-center mt-1">
                  {flowArrows[2].labels.map((l) => (
                    <span key={l} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">{l}</span>
                  ))}
                </div>
              </div>

              {/* Platform Box */}
              <div className="flex flex-col items-center">
                <div className={`rounded-xl border-2 border-violet-500/40 bg-violet-500/10 px-6 py-4 text-center min-w-[160px]`}>
                  <Layers className="w-6 h-6 mx-auto mb-1 text-violet-600 dark:text-violet-400" />
                  <p className="font-semibold text-sm">Platform</p>
                  <p className="text-[10px] text-muted-foreground">Leverage & Scale</p>
                </div>
              </div>
            </div>

            {/* Secondary flows */}
            <div className="flex flex-wrap justify-center gap-4 mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">Growth</span>
                <ArrowRight className="w-3 h-3" />
                <span className="font-medium text-violet-600 dark:text-violet-400">Platform</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border">Content Tenancy</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-violet-600 dark:text-violet-400">Platform</span>
                <ArrowRight className="w-3 h-3" />
                <span className="font-medium">All Layers</span>
                {flowArrows[3].labels.map((l) => (
                  <span key={l} className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20">{l}</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Cross-Layer Dependencies (Collapsible) ─────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Cross-Layer Dependencies
              {search && <Badge variant="secondary" className="ml-2 text-xs">{filteredDeps.length} result{filteredDeps.length !== 1 ? "s" : ""}</Badge>}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Ownership boundaries and data flows between layers. Click to expand details.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(depTypeBadge).map(([type, cls]) => (
                <Badge key={type} variant="outline" className={cls}>
                  {type.replace("-", " ")}
                </Badge>
              ))}
            </div>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {filteredDeps.map((dep) => (
                  <Collapsible key={dep.name}>
                    <div className="border rounded-lg bg-muted/30 overflow-hidden">
                      <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-2 flex-wrap text-left">
                          <span className="font-semibold text-sm">{dep.name}</span>
                          <Badge variant="outline" className={depTypeBadge[dep.type]}>
                            {dep.type.replace("-", " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                            <span>{dep.from}</span>
                            <ArrowRight className="w-3 h-3" />
                            <span>{dep.to}</span>
                          </div>
                          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 pt-1 space-y-2 border-t border-border">
                          <p className="text-sm text-muted-foreground">{dep.description}</p>
                          <div className="flex items-start gap-2">
                            <Shield className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                            <p className="text-xs font-medium">{dep.ownership}</p>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* ── Detailed Breakdowns ────────────────────────────── */}
        <Tabs defaultValue="growth">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="growth" className="text-xs sm:text-sm">Growth Layer</TabsTrigger>
            <TabsTrigger value="delivery" className="text-xs sm:text-sm">Delivery Layer</TabsTrigger>
            <TabsTrigger value="platform" className="text-xs sm:text-sm">Platform Layer</TabsTrigger>
          </TabsList>

          {filteredLayers.map((layer) => {
            const s = layerStyles[layer.key];
            const routes = search ? layer.filteredRoutes : layer.routes;
            const tables = search ? layer.filteredTables : layer.tables;
            const fns = search ? layer.filteredFunctions : layer.edgeFunctions;
            return (
              <TabsContent key={layer.key} value={layer.key} className="space-y-6 mt-6">
                {/* Routes */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Route className={`w-4 h-4 ${s.text}`} />
                      Routes ({routes.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {routes.map((r) => (
                        <Badge key={r} variant="outline" className="font-mono text-xs">
                          <Globe className="w-3 h-3 mr-1" />
                          {r}
                        </Badge>
                      ))}
                      {routes.length === 0 && <p className="text-sm text-muted-foreground">No matches.</p>}
                    </div>
                  </CardContent>
                </Card>

                {/* Tables */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Database className={`w-4 h-4 ${s.text}`} />
                      Database Tables ({tables.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Table Name</TableHead>
                          <TableHead>Prefix</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tables.map((t, i) => {
                          const prefix = t.startsWith("wl_") ? "wl_" :
                            t.startsWith("admin_") ? "admin_" :
                            t.startsWith("agent_") ? "agent_" :
                            t.startsWith("affiliate_") ? "affiliate_" :
                            t.startsWith("client_") ? "client_" :
                            t.startsWith("call_") ? "call_" : "—";
                          return (
                            <TableRow key={t}>
                              <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                              <TableCell className="font-mono text-xs">{t}</TableCell>
                              <TableCell>
                                {prefix !== "—" && (
                                  <Badge variant="secondary" className="text-[10px]">{prefix}</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {tables.length === 0 && (
                          <TableRow><TableCell colSpan={3} className="text-muted-foreground">No matches.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Edge Functions */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className={`w-4 h-4 ${s.text}`} />
                      Edge Functions ({fns.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {fns.map((fn) => (
                        <div key={fn} className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-md">
                          <Zap className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="font-mono text-xs truncate">{fn}</span>
                        </div>
                      ))}
                      {fns.length === 0 && <p className="text-sm text-muted-foreground">No matches.</p>}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>

        {/* ── Summary Stats ──────────────────────────────────── */}
        <Separator />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{layers.reduce((s, l) => s + l.routes.length, 0)}</p>
            <p className="text-xs text-muted-foreground">Total Routes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{layers.reduce((s, l) => s + l.tables.length, 0)}</p>
            <p className="text-xs text-muted-foreground">Total Tables</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{layers.reduce((s, l) => s + l.edgeFunctions.length, 0)}</p>
            <p className="text-xs text-muted-foreground">Edge Functions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{crossDeps.length}</p>
            <p className="text-xs text-muted-foreground">Cross-Layer Deps</p>
          </div>
        </div>
      </div>
    
  );
}
