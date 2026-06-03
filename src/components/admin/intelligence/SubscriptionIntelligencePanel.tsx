/**
 * Phase 17 — Canonical Subscription / MRR / Churn Model
 * Admin-only intelligence panel exposing the canonical recurring-revenue layer.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Repeat, AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import {
  fetchSubscriptionTruthBundle,
  formatUsd,
  totalActiveKnownMrr,
  totalActiveSubs,
  totalUnknownMrrSubs,
  type SubscriptionTruthBundle,
} from "@/lib/governance/subscriptionTruth";

export default function SubscriptionIntelligencePanel() {
  const [bundle, setBundle] = useState<SubscriptionTruthBundle | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchSubscriptionTruthBundle()
      .then((b) => { if (!cancelled) setBundle(b); })
      .catch(() => { if (!cancelled) setBundle(null); });
    return () => { cancelled = true; };
  }, []);

  if (bundle === undefined) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (!bundle) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          Subscription truth views are unavailable in this context.
        </CardContent>
      </Card>
    );
  }

  const activeMrr = totalActiveKnownMrr(bundle.mrr);
  const activeSubs = totalActiveSubs(bundle.mrr);
  const unknownMrrSubs = totalUnknownMrrSubs(bundle.mrr);
  const wlRecurring = bundle.directVsWl.find((d) => d.stream === "wl")?.recurring_proxy_usd ?? 0;
  const churnedAll = bundle.churn.length;

  return (
    <div className="space-y-6">
      {/* Honesty banner */}
      <Card className="border-dashed">
        <CardContent className="py-4 text-xs text-muted-foreground space-y-1">
          <p>
            <strong>Truth-first recurring revenue.</strong> MRR is computed only from canonical custom-plan values
            (minimum monthly or fixed amount). Subscriptions without a canonical contract value are surfaced as
            "unknown MRR" rather than guessed from price tables.
          </p>
          <p>
            WL recurring is a labeled proxy (trailing 90-day paid invoice average per partner). Overage and one-time
            charges are excluded from MRR. Churn means an explicit transition into pipeline_stage churned/lost,
            never inactivity. Expansion / contraction reports zero until a discrete movement event log exists.
          </p>
        </CardContent>
      </Card>

      {/* KPI tiles */}
      <div className="grid gap-4 md:grid-cols-4">
        <KpiTile icon={<Repeat className="h-4 w-4" />} label="Active subscriptions" value={String(activeSubs)} />
        <KpiTile
          icon={<TrendingUp className="h-4 w-4" />}
          label="Direct active MRR (known)"
          value={formatUsd(activeMrr)}
          hint={unknownMrrSubs > 0 ? `${unknownMrrSubs} active w/ unknown MRR` : undefined}
        />
        <KpiTile
          icon={<Repeat className="h-4 w-4" />}
          label="WL recurring (90d avg proxy)"
          value={formatUsd(Number(wlRecurring) || 0)}
        />
        <KpiTile icon={<TrendingDown className="h-4 w-4" />} label="Churned subscriptions" value={String(churnedAll)} />
      </div>

      {/* Direct vs WL */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Direct vs White-Label recurring</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="text-left py-2 pr-4">Stream</th>
                  <th className="text-right py-2 pr-4">Active</th>
                  <th className="text-right py-2 pr-4">Canceled</th>
                  <th className="text-right py-2 pr-4">Known MRR</th>
                  <th className="text-right py-2 pr-4">Recurring proxy</th>
                  <th className="text-left py-2">Basis</th>
                </tr>
              </thead>
              <tbody>
                {bundle.directVsWl.map((row) => (
                  <tr key={row.stream} className="border-t">
                    <td className="py-2 pr-4 font-medium uppercase">{row.stream}</td>
                    <td className="py-2 pr-4 text-right">{row.active_subscriptions}</td>
                    <td className="py-2 pr-4 text-right">{row.canceled_subscriptions}</td>
                    <td className="py-2 pr-4 text-right">{formatUsd(row.known_mrr_usd)}</td>
                    <td className="py-2 pr-4 text-right">
                      {row.recurring_proxy_usd === null ? "—" : formatUsd(row.recurring_proxy_usd)}
                    </td>
                    <td className="py-2 text-muted-foreground text-xs">{row.basis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Plan summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Plan / tier recurring summary</CardTitle>
        </CardHeader>
        <CardContent>
          {bundle.plans.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">No plan recurring data yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="text-left py-2 pr-4">Plan</th>
                    <th className="text-left py-2 pr-4">Stream</th>
                    <th className="text-right py-2 pr-4">Active</th>
                    <th className="text-right py-2 pr-4">Canceled</th>
                    <th className="text-right py-2 pr-4">Past due</th>
                    <th className="text-right py-2 pr-4">Active MRR (known)</th>
                    <th className="text-right py-2">Avg active MRR</th>
                  </tr>
                </thead>
                <tbody>
                  {bundle.plans.map((row, i) => (
                    <tr key={`${row.plan_name}-${row.acquisition_type}-${i}`} className="border-t">
                      <td className="py-2 pr-4">{row.plan_name}</td>
                      <td className="py-2 pr-4 uppercase text-xs">{row.acquisition_type}</td>
                      <td className="py-2 pr-4 text-right">{row.active_count}</td>
                      <td className="py-2 pr-4 text-right">{row.canceled_count}</td>
                      <td className="py-2 pr-4 text-right">{row.past_due_count}</td>
                      <td className="py-2 pr-4 text-right">{formatUsd(row.active_known_mrr_usd)}</td>
                      <td className="py-2 text-right">
                        {row.avg_active_known_mrr_usd === null ? "—" : formatUsd(row.avg_active_known_mrr_usd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Movements */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">MRR movements (12 months, derived)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="text-left py-2 pr-4">Month</th>
                  <th className="text-right py-2 pr-4">New subs</th>
                  <th className="text-right py-2 pr-4">New MRR</th>
                  <th className="text-right py-2 pr-4">Churned subs</th>
                  <th className="text-right py-2 pr-4">Churned MRR</th>
                  <th className="text-right py-2 pr-4">Expansion</th>
                  <th className="text-right py-2">Contraction</th>
                </tr>
              </thead>
              <tbody>
                {bundle.movements.map((row) => (
                  <tr key={row.month_start} className="border-t">
                    <td className="py-2 pr-4">{row.month_start.slice(0, 7)}</td>
                    <td className="py-2 pr-4 text-right">{row.new_subs}</td>
                    <td className="py-2 pr-4 text-right">{formatUsd(row.new_mrr_usd)}</td>
                    <td className="py-2 pr-4 text-right">{row.churned_subs}</td>
                    <td className="py-2 pr-4 text-right">{formatUsd(row.churned_mrr_usd)}</td>
                    <td className="py-2 pr-4 text-right text-muted-foreground">0 *</td>
                    <td className="py-2 text-right text-muted-foreground">0 *</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[11px] text-muted-foreground mt-2">
              * Expansion / contraction grain requires a discrete movement event log not yet captured. Reported as zero
              instead of fabricated.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recent churn */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">Churn events</CardTitle>
          <Badge variant="outline">{churnedAll}</Badge>
        </CardHeader>
        <CardContent>
          {bundle.churn.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              No canonical churn events recorded.
            </div>
          ) : (
            <ul className="divide-y">
              {bundle.churn.slice(0, 12).map((c) => (
                <li key={c.lead_id} className="py-2 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{c.name || c.company || c.lead_id.slice(0, 8)}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.plan_name || "—"} · {c.acquisition_type.toUpperCase()} · {c.lifetime_days}d lifetime
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatUsd(c.lost_mrr_usd ?? 0)}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.canceled_at ? new Date(c.canceled_at).toLocaleDateString() : "—"}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiTile({
  icon, label, value, hint,
}: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}
