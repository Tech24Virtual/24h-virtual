/**
 * Phase 14 — Commercial Intelligence admin panel
 *
 * Honest, admin-only commercial view:
 *  1) Plan / package performance (from billing_summaries)
 *  2) Direct vs WL monetization throughput (from internal_fulfillment_intakes)
 *  3) Revenue mix (PROXY — clearly labeled)
 *  4) Lifecycle signals: expansion / downgrade-risk / stalled / steady
 *
 * Distinct from:
 *   - Reporting (Phase 9): time-series operational KPIs
 *   - Forecasts (Phase 10): short-horizon advisory projections
 *   - Growth (Phase 13): acquisition-side intelligence
 *
 * No mutations, no public surface. Backed by SECURITY INVOKER views.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Info, Package, GitCompare, DollarSign, Activity } from "lucide-react";
import {
  fetchCommercialIntelligence,
  topPlans,
  lifecycleLabel,
  streamLabel,
  formatUsd,
  type CommercialIntelligenceBundle,
  type LifecycleSignal,
} from "@/lib/governance/commercialIntelligence";

function fmtPct(n: number | null | undefined) {
  if (n == null) return "—";
  return `${Number(n).toFixed(1)}%`;
}
function fmtDays(n: number | null | undefined) {
  if (n == null) return "—";
  return `${Number(n).toFixed(1)}d`;
}
function fmtNum(n: number | null | undefined) {
  return (Number(n ?? 0)).toLocaleString();
}

const SIGNAL_VARIANT: Record<LifecycleSignal, "default" | "secondary" | "destructive" | "outline"> = {
  expansion: "default",
  steady: "secondary",
  downgrade_risk: "destructive",
  stalled: "destructive",
  insufficient_history: "outline",
};

export function CommercialIntelligencePanel() {
  const [data, setData] = useState<CommercialIntelligenceBundle | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchCommercialIntelligence()
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData(null); });
    return () => { cancelled = true; };
  }, []);

  if (data === undefined) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (data === null) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Commercial intelligence views are unavailable. Admin/billing role required.
        </CardContent>
      </Card>
    );
  }

  const plans = topPlans(data.plans);
  const totalDirectMix = data.revenueMix.find((r) => r.stream === "direct")?.amount ?? 0;
  const totalWlMix = data.revenueMix.find((r) => r.stream === "wl")?.amount ?? 0;

  return (
    <div className="space-y-6">
      {/* Honesty banner */}
      <Card className="border-dashed">
        <CardContent className="py-4 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Commercial intelligence uses canonical billing, intake, and white-label invoice data.
            Revenue figures here are <strong>proxies</strong>, direct uses overage_amount only,
            white-label uses paid invoices. Lifecycle signals are bounded heuristics over the latest
            two billing periods, not predictive churn.
          </span>
        </CardContent>
      </Card>

      {/* A. Direct vs WL throughput */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-primary" />
            Direct vs White Label Monetization
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.directVsWl.length === 0 ? (
            <p className="text-sm text-muted-foreground">No intake activity yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.directVsWl.map((row) => (
                <div key={row.acquisition_type} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold capitalize">{row.acquisition_type}</span>
                    <Badge variant="outline">{fmtNum(row.intakes)} intakes</Badge>
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-muted-foreground">Activations</dt>
                    <dd className="text-right">{fmtNum(row.activations)}</dd>
                    <dt className="text-muted-foreground">Activation rate</dt>
                    <dd className="text-right">{fmtPct(row.activation_rate_pct)}</dd>
                    <dt className="text-muted-foreground">Avg time to activate</dt>
                    <dd className="text-right">{fmtDays(row.avg_days_to_activate)}</dd>
                    {row.acquisition_type === "wl" && (
                      <>
                        <dt className="text-muted-foreground">Distinct partners</dt>
                        <dd className="text-right">{fmtNum(row.distinct_wl_partners)}</dd>
                      </>
                    )}
                  </dl>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* B. Revenue mix proxy */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Revenue Mix (Last 365 Days · Proxy)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.revenueMix.length === 0 ? (
            <p className="text-sm text-muted-foreground">No billing activity yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.revenueMix.map((row) => (
                <div key={row.stream} className="rounded-xl border p-4">
                  <p className="text-xs text-muted-foreground mb-1">{streamLabel(row.stream)}</p>
                  <p className="text-2xl font-semibold">{formatUsd(row.amount)}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {fmtNum(row.records)} records
                  </p>
                </div>
              ))}
              <div className="rounded-xl border p-4 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Combined Proxy</p>
                <p className="text-2xl font-semibold">{formatUsd(totalDirectMix + totalWlMix)}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Not a financial statement
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* C. Plan / package performance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Package / Plan Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No billing periods recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2 pr-4">Plan</th>
                    <th className="py-2 pr-4 text-right">Clients</th>
                    <th className="py-2 pr-4 text-right">Periods</th>
                    <th className="py-2 pr-4 text-right">Total Min</th>
                    <th className="py-2 pr-4 text-right">Overage Min</th>
                    <th className="py-2 pr-4 text-right">Overage Rev (proxy)</th>
                    <th className="py-2 pr-4 text-right">% Periods w/ Overage</th>
                    <th className="py-2 pr-0 text-right">Avg Strain</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr key={p.plan_name} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{p.plan_name}</td>
                      <td className="py-2 pr-4 text-right">{fmtNum(p.distinct_clients)}</td>
                      <td className="py-2 pr-4 text-right">{fmtNum(p.billing_periods)}</td>
                      <td className="py-2 pr-4 text-right">{fmtNum(p.total_minutes)}</td>
                      <td className="py-2 pr-4 text-right">{fmtNum(p.overage_minutes)}</td>
                      <td className="py-2 pr-4 text-right">{formatUsd(p.overage_revenue_proxy)}</td>
                      <td className="py-2 pr-4 text-right">{fmtPct(p.pct_periods_with_overage)}</td>
                      <td className="py-2 pr-0 text-right">{fmtPct(p.avg_overage_pct_of_included)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* D. Lifecycle signals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Lifecycle Signals (Heuristic)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.lifecycleSummary.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clients with billing history yet.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {data.lifecycleSummary.map((row) => (
                <div key={row.signal} className="rounded-xl border p-4">
                  <Badge variant={SIGNAL_VARIANT[row.signal]} className="mb-2">
                    {lifecycleLabel(row.signal)}
                  </Badge>
                  <p className="text-2xl font-semibold">{fmtNum(row.clients)}</p>
                  <p className="text-xs text-muted-foreground">clients</p>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            Rules: <em>expansion</em> = latest overage rate &gt; prior + 25pp ·{" "}
            <em>downgrade_risk</em> = latest minutes &lt; 75% of prior ·{" "}
            <em>stalled</em> = no billing period in last 60d ·{" "}
            <em>insufficient_history</em> = fewer than 2 periods.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default CommercialIntelligencePanel;
