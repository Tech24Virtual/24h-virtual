import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink } from "lucide-react";
import { fetchRevenuePipeline, type RevenuePipelineRow } from "@/lib/governance/revenueOverview";
import { fetchDeliveryPipeline, type DeliveryPipelineRow } from "@/lib/governance/deliveryOverview";
import { fetchGrowthOverview, type GrowthOverview } from "@/lib/governance/growthOverview";
import {
  fetchVoiceReadinessSummary,
  fetchWLPartnerReadinessSummary,
  type VoiceReadinessSummary,
  type WLPartnerReadinessSummary,
} from "@/lib/governance/missionControl";
import {
  fetchRecommendationTrend,
  type RecommendationTrendBucket,
  DOMAIN_LABEL,
} from "@/lib/governance/intelligence";

interface PanelProps {
  title: string;
  drillRoute: string;
  children: React.ReactNode;
}

function Panel({ title, drillRoute, children }: PanelProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <Link to={drillRoute} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            Drill in <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">{children}</CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "warn" | "positive" }) {
  const toneClass =
    tone === "warn" ? "text-destructive" : tone === "positive" ? "text-emerald-600 dark:text-emerald-400" : "";
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono font-medium tabular-nums ${toneClass}`}>{value}</span>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-6 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
    </div>
  );
}

export function DomainAnalyticsPanel() {
  const [growth, setGrowth] = useState<GrowthOverview | null | undefined>(undefined);
  const [revenue, setRevenue] = useState<RevenuePipelineRow[] | undefined>(undefined);
  const [delivery, setDelivery] = useState<DeliveryPipelineRow[] | undefined>(undefined);
  const [voice, setVoice] = useState<VoiceReadinessSummary | undefined>(undefined);
  const [wl, setWl] = useState<WLPartnerReadinessSummary | undefined>(undefined);
  const [drift, setDrift] = useState<RecommendationTrendBucket[] | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchGrowthOverview().catch(() => null),
      fetchRevenuePipeline().catch(() => []),
      fetchDeliveryPipeline().catch(() => []),
      fetchVoiceReadinessSummary().catch(() => undefined as any),
      fetchWLPartnerReadinessSummary().catch(() => undefined as any),
      fetchRecommendationTrend().catch(() => []),
    ]).then(([g, r, d, v, w, dr]) => {
      if (cancelled) return;
      setGrowth(g);
      setRevenue(r);
      setDelivery(d);
      setVoice(v);
      setWl(w);
      setDrift(dr);
    });
    return () => { cancelled = true; };
  }, []);

  const revenueTotal = revenue?.reduce((s, r) => s + (r.lead_count ?? 0), 0) ?? 0;
  const revenueValue = revenue?.reduce((s, r) => s + Number(r.estimated_value_usd ?? 0), 0) ?? 0;
  const revenueOverdue = revenue?.reduce((s, r) => s + (r.overdue_followups ?? 0), 0) ?? 0;
  const deliveryTotal = delivery?.reduce((s, r) => s + (r.intake_count ?? 0), 0) ?? 0;
  const deliveryUrgent = delivery?.reduce((s, r) => s + (r.urgent_count ?? 0), 0) ?? 0;
  const deliveryWl = delivery?.reduce((s, r) => s + (r.wl_count ?? 0), 0) ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* GROWTH */}
      <Panel title="Growth Analytics" drillRoute="/admin/discoverability">
        {growth === undefined ? <Spinner /> : !growth ? <p className="text-muted-foreground">Unavailable.</p> : (
          <>
            <Stat label="Disc pages published" value={growth.disc_pages_published ?? 0} tone="positive" />
            <Stat label="Ready to publish" value={growth.disc_pages_ready_to_publish ?? 0} />
            <Stat label="Need rewrite" value={growth.disc_pages_needs_rewrite ?? 0} tone={(growth.disc_pages_needs_rewrite ?? 0) > 0 ? "warn" : undefined} />
            <Stat label="Blog posts published" value={growth.blog_posts_published ?? 0} />
            <Stat label="Keywords tracked" value={growth.keywords_tracked ?? 0} />
          </>
        )}
      </Panel>

      {/* REVENUE */}
      <Panel title="Revenue Analytics" drillRoute="/admin/leads">
        {revenue === undefined ? <Spinner /> : (
          <>
            <Stat label="Active leads" value={revenueTotal} />
            <Stat label="Pipeline value" value={`$${revenueValue.toLocaleString()}`} />
            <Stat label="Overdue follow-ups" value={revenueOverdue} tone={revenueOverdue > 0 ? "warn" : undefined} />
            <Stat label="Active stages" value={revenue.length} />
          </>
        )}
      </Panel>

      {/* DELIVERY */}
      <Panel title="Delivery Analytics" drillRoute="/admin/fulfillment-intake">
        {delivery === undefined ? <Spinner /> : (
          <>
            <Stat label="Intakes in pipeline" value={deliveryTotal} />
            <Stat label="Urgent" value={deliveryUrgent} tone={deliveryUrgent > 0 ? "warn" : undefined} />
            <Stat label="From WL partners" value={deliveryWl} />
            <Stat label="Active stages" value={delivery.length} />
          </>
        )}
      </Panel>

      {/* VOICE */}
      <Panel title="AI Voice Analytics" drillRoute="/admin/campaign-os/call-flows">
        {voice === undefined ? <Spinner /> : (
          <>
            <Stat label="Total flows" value={voice.total_flows} />
            <Stat label="Live receptionists" value={voice.live} tone="positive" />
            <Stat label="Ready to activate" value={voice.ready_to_activate} />
            <Stat label="Awaiting script publish" value={voice.awaiting_script_publish} tone={voice.awaiting_script_publish > 0 ? "warn" : undefined} />
            <Stat label="Awaiting number" value={voice.awaiting_number} tone={voice.awaiting_number > 0 ? "warn" : undefined} />
          </>
        )}
      </Panel>

      {/* WL */}
      <Panel title="White Label Analytics" drillRoute="/admin/partners">
        {wl === undefined ? <Spinner /> : (
          <>
            <Stat label="Partners total" value={wl.partners_total} />
            <Stat label="Live" value={wl.partners_live} tone="positive" />
            <Stat label="Branded" value={wl.partners_branded} />
            <Stat label="Domain pending" value={wl.partners_domain_pending} />
            <Stat label="Pending activation" value={wl.partners_pending} />
          </>
        )}
      </Panel>

      {/* AUTOMATION */}
      <Panel title="Automation Analytics" drillRoute="/admin/mission-control">
        {drift === undefined ? <Spinner /> : drift.length === 0 ? (
          <p className="text-muted-foreground py-2">No open recommendations.</p>
        ) : (
          <div className="space-y-2">
            {drift.map((d) => (
              <div key={d.domain} className="flex items-center justify-between">
                <span className="text-muted-foreground">{DOMAIN_LABEL[d.domain] ?? d.domain}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{d.open} open</Badge>
                  {d.warn_or_critical > 0 && (
                    <Badge variant="destructive" className="text-xs">{d.warn_or_critical} warn</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
