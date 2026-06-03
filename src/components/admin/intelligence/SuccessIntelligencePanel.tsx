/**
 * Phase 16 — Retention / Success Intelligence admin panel
 *
 * Honest, admin-only post-go-live success view:
 *   1) Health bands (healthy / watch / intervention) with explicit rules
 *   2) Risk buckets ranked by frequency
 *   3) Direct vs WL portfolio comparison
 *   4) Top intervention-needed accounts (with reasons + drill links)
 *   5) Expansion-ready accounts
 *
 * Distinct from:
 *   - Reporting (Phase 9): time-series operational KPIs
 *   - Forecasts (Phase 10): short-horizon projections
 *   - Growth (Phase 13): acquisition-side intelligence
 *   - Commercial (Phase 14): packaging/pricing/lifecycle proxies
 *   - Activation (Phase 15): pre-go-live readiness funnel
 *
 * No mutations, no public surface. SECURITY INVOKER views.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Info, HeartPulse, AlertTriangle, TrendingUp, GitCompare, Users } from "lucide-react";
import { trackEvent, track } from "@/lib/analytics";
import {
  fetchSuccessIntelligence,
  HEALTH_BAND_RULES,
  reasonLabel,
  bandLabel,
  bandTone,
  lifecycleLabel,
  summaryByBand,
  type SuccessIntelligenceBundle,
  type HealthBand,
  type SuccessAccountRow,
} from "@/lib/governance/successIntelligence";

function fmtNum(n: number | null | undefined) {
  return Number(n ?? 0).toLocaleString();
}
function fmtAvg(n: number | null | undefined, suffix = "d") {
  if (n == null) return "—";
  return `${Number(n).toFixed(1)}${suffix}`;
}

function BandTile({ band, count, direct, wl }: { band: HealthBand; count: number; direct: number; wl: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{bandLabel(band)}</span>
          <Badge variant={bandTone(band)}>{fmtNum(count)}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-muted-foreground">
        <div className="flex justify-between"><span>Direct</span><span>{fmtNum(direct)}</span></div>
        <div className="flex justify-between"><span>White Label</span><span>{fmtNum(wl)}</span></div>
        <p className="text-xs pt-2 border-t mt-2">{HEALTH_BAND_RULES[band]}</p>
      </CardContent>
    </Card>
  );
}

export default function SuccessIntelligencePanel() {
  const [bundle, setBundle] = useState<SuccessIntelligenceBundle | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    trackEvent({ name: "success_panel_viewed", surface: "admin_intelligence", persona: "admin" });
    fetchSuccessIntelligence()
      .then((b) => { if (!cancelled) setBundle(b); })
      .catch(() => { if (!cancelled) setBundle(null); });
    return () => { cancelled = true; };
  }, []);

  const interventionAccounts = useMemo<SuccessAccountRow[]>(() => {
    if (!bundle) return [];
    return [...bundle.accounts]
      .filter((a) => a.health_band === "intervention")
      .sort((a, b) => b.reasons.length - a.reasons.length || b.open_tickets_count - a.open_tickets_count)
      .slice(0, 12);
  }, [bundle]);

  if (bundle === undefined) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (bundle === null) {
    return (
      <Card><CardContent className="py-10 text-sm text-muted-foreground">
        Unable to load success intelligence. This view is admin/billing scoped.
      </CardContent></Card>
    );
  }

  const summary = summaryByBand(bundle.summary);

  return (
    <div className="space-y-6">
      <Card className="border-dashed">
        <CardContent className="py-3 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            <strong className="text-foreground">Honesty note.</strong> Health bands are rule-based buckets over canonical
            delivery, receptionist, ticket, and Phase 14 lifecycle signals. They are not ML risk scores or churn
            predictions. Every flagged account exposes the explicit reasons below it.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BandTile band="healthy"      count={summary.healthy.accounts}      direct={summary.healthy.direct_accounts}      wl={summary.healthy.wl_accounts} />
        <BandTile band="watch"        count={summary.watch.accounts}        direct={summary.watch.direct_accounts}        wl={summary.watch.wl_accounts} />
        <BandTile band="intervention" count={summary.intervention.accounts} direct={summary.intervention.direct_accounts} wl={summary.intervention.wl_accounts} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" /> Risk Buckets</CardTitle>
          </CardHeader>
          <CardContent>
            {bundle.riskBuckets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No risk signals across live accounts.</p>
            ) : (
              <ul className="space-y-2">
                {bundle.riskBuckets.map((r) => (
                  <li key={r.reason} className="flex items-center justify-between text-sm">
                    <button
                      className="text-left hover:underline"
                      onClick={() => track.cta("admin_success", "risk_bucket_open", "admin", { reason: r.reason })}
                    >
                      {reasonLabel(r.reason)}
                    </button>
                    <Badge variant="secondary">{fmtNum(r.accounts)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><GitCompare className="h-4 w-4 text-primary" /> Direct vs White Label</CardTitle>
          </CardHeader>
          <CardContent>
            {bundle.directVsWl.length === 0 ? (
              <p className="text-sm text-muted-foreground">No live accounts yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left py-1">Type</th>
                    <th className="text-right">Accts</th>
                    <th className="text-right">Healthy</th>
                    <th className="text-right">Watch</th>
                    <th className="text-right">Interv.</th>
                    <th className="text-right">Avg live</th>
                  </tr>
                </thead>
                <tbody>
                  {bundle.directVsWl.map((r) => (
                    <tr key={r.acquisition_type} className="border-t">
                      <td className="py-1.5 capitalize">{r.acquisition_type === "wl" ? "White Label" : "Direct"}</td>
                      <td className="text-right">{fmtNum(r.accounts)}</td>
                      <td className="text-right">{fmtNum(r.healthy)}</td>
                      <td className="text-right">{fmtNum(r.watch)}</td>
                      <td className="text-right">{fmtNum(r.intervention)}</td>
                      <td className="text-right">{fmtAvg(r.avg_days_live)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><HeartPulse className="h-4 w-4 text-primary" /> Top Intervention Candidates</CardTitle>
        </CardHeader>
        <CardContent>
          {interventionAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accounts currently flagged for intervention.</p>
          ) : (
            <ul className="divide-y">
              {interventionAccounts.map((a) => (
                <li key={a.lead_id} className="py-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{a.company || a.name || a.lead_id}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {a.acquisition_type === "wl" ? "WL" : "Direct"} · live {a.days_live}d · {lifecycleLabel(a.lifecycle_signal)}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {a.reasons.slice(0, 4).map((r) => (
                        <Badge key={r} variant="outline" className="text-[10px]">{reasonLabel(r)}</Badge>
                      ))}
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline"
                    onClick={() => track.cta("admin_success", "intervention_open", "admin", { lead_id: a.lead_id, reasons: a.reasons })}>
                    <Link to={`/admin/clients?lead=${a.lead_id}`}>Open</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Expansion-Ready Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {bundle.expansion.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expansion candidates surfaced this period.</p>
          ) : (
            <ul className="divide-y">
              {bundle.expansion.slice(0, 12).map((a) => (
                <li key={a.lead_id} className="py-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-2">
                      {a.company || a.name || a.lead_id}
                      <Badge variant="default" className="text-[10px]">{lifecycleLabel(a.lifecycle_signal)}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {a.acquisition_type === "wl" ? "WL" : "Direct"} · plan {a.plan_name || "—"} · live {a.days_live}d · receptionist {a.receptionist_health}
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline"
                    onClick={() => track.cta("admin_success", "expansion_open", "admin", { lead_id: a.lead_id })}>
                    <Link to={`/admin/clients?lead=${a.lead_id}`}>Open</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Users className="h-3 w-3" /> Admin/billing scope only. No partner or client surface reads this layer.
      </p>
    </div>
  );
}
