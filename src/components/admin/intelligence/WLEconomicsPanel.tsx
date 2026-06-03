/**
 * Phase 20 — WL Economics & Partner Profitability
 * Admin-only intelligence panel. Do not expose to partner-facing surfaces.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Building2, TrendingUp, DollarSign, PieChart } from "lucide-react";
import {
  fetchWlEconomicsBundle,
  formatUsd,
  formatPct,
  wlCoverageLabel,
  type WlEconomicsBundle,
  type WlEconCoverageFlag,
} from "@/lib/governance/wlEconomics";

function flagVariant(flag: WlEconCoverageFlag): "default" | "secondary" | "outline" | "destructive" {
  switch (flag) {
    case "partial_ok": return "default";
    case "recurring_unknown": return "secondary";
    case "servicing_cost_unknown": return "outline";
    case "no_data": return "destructive";
  }
}

export default function WLEconomicsPanel() {
  const [bundle, setBundle] = useState<WlEconomicsBundle | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchWlEconomicsBundle()
      .then((b) => { if (!cancelled) setBundle(b); })
      .catch(() => { if (!cancelled) setBundle(null); });
    return () => { cancelled = true; };
  }, []);

  if (bundle === undefined) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (bundle === null) {
    return <p className="text-sm text-destructive">Failed to load WL economics.</p>;
  }

  const t = bundle.totals;

  return (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Honesty notice.</strong> Recurring value is a labeled 90-day paid-invoice average proxy, not canonical MRR.
          Servicing cost is the most recent <code>wl_partner_usage_summary</code> wholesale + campaign fees. Acquisition cost reflects
          approved or paid sales commissions only; partner-side spend is excluded. Partial margin is monthly recurring proxy minus
          servicing proxy and is NULL whenever either input is missing. Admin-only; never expose cross-partner economics to partner surfaces.
        </AlertDescription>
      </Alert>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-2 text-muted-foreground"><Building2 className="h-4 w-4" />Partners</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{t?.partners_active ?? 0}<span className="text-sm font-normal text-muted-foreground"> / {t?.partners_total ?? 0}</span></p><p className="text-xs text-muted-foreground">active / total</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-2 text-muted-foreground"><DollarSign className="h-4 w-4" />Recurring proxy</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{formatUsd(t?.sum_recurring_value_proxy_usd)}</p><p className="text-xs text-muted-foreground">90d paid-invoice avg, sum</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-2 text-muted-foreground"><PieChart className="h-4 w-4" />Servicing cost</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{formatUsd(t?.sum_servicing_cost_proxy_usd)}</p><p className="text-xs text-muted-foreground">latest period, sum</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-2 text-muted-foreground"><TrendingUp className="h-4 w-4" />Partial margin</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{formatUsd(t?.sum_partial_margin_proxy_usd)}</p><p className="text-xs text-muted-foreground">recurring − servicing</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Partner Profitability Ranking</CardTitle>
          <CardDescription>Ordered by partial margin proxy. Partners with NULL margin rank last; do not interpret as zero.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Active Clients</TableHead>
                <TableHead className="text-right">Recurring (proxy)</TableHead>
                <TableHead className="text-right">Servicing</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">Margin %</TableHead>
                <TableHead className="text-right">Acq Cost</TableHead>
                <TableHead>Coverage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bundle.ranking.slice(0, 25).map((r) => (
                <TableRow key={r.partner_id}>
                  <TableCell className="text-xs text-muted-foreground">{r.margin_rank}</TableCell>
                  <TableCell className="font-medium">{r.company_name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{r.tier ?? "—"}</Badge></TableCell>
                  <TableCell className="text-right">{r.active_clients}</TableCell>
                  <TableCell className="text-right">{formatUsd(r.recurring_value_proxy_usd)}</TableCell>
                  <TableCell className="text-right">{formatUsd(r.servicing_cost_proxy_usd)}</TableCell>
                  <TableCell className="text-right font-medium">{formatUsd(r.partial_margin_proxy_usd)}</TableCell>
                  <TableCell className="text-right">{formatPct(r.partial_margin_pct)}</TableCell>
                  <TableCell className="text-right">{formatUsd(r.known_acq_cost_usd)}</TableCell>
                  <TableCell>
                    <Badge variant={flagVariant(r.coverage_flag)} className="text-xs">
                      {wlCoverageLabel(r.coverage_flag)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {bundle.ranking.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">No partner economics data.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-Partner Health Overlay</CardTitle>
          <CardDescription>Lifecycle signals across each partner's client portfolio. Source: v_commercial_lifecycle_signals.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead className="text-right">Total Clients</TableHead>
                <TableHead className="text-right">Active</TableHead>
                <TableHead className="text-right">Expansion</TableHead>
                <TableHead className="text-right">Stable</TableHead>
                <TableHead className="text-right">Contraction</TableHead>
                <TableHead className="text-right">Signal Coverage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bundle.partners.slice(0, 25).map((p) => (
                <TableRow key={p.partner_id}>
                  <TableCell className="font-medium">{p.company_name}</TableCell>
                  <TableCell className="text-right">{p.total_clients}</TableCell>
                  <TableCell className="text-right">{p.active_clients}</TableCell>
                  <TableCell className="text-right text-emerald-600">{p.clients_expansion}</TableCell>
                  <TableCell className="text-right">{p.clients_stable}</TableCell>
                  <TableCell className="text-right text-amber-600">{p.clients_contraction}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {p.clients_with_signal} / {p.total_clients}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Partner Cohort Economics</CardTitle>
          <CardDescription>By partner onboard month. Recurring/servicing remain proxies.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cohort</TableHead>
                <TableHead className="text-right">Partners</TableHead>
                <TableHead className="text-right">Active Partners</TableHead>
                <TableHead className="text-right">Active Clients</TableHead>
                <TableHead className="text-right">Avg Recurring</TableHead>
                <TableHead className="text-right">Sum Recurring</TableHead>
                <TableHead className="text-right">Avg Margin %</TableHead>
                <TableHead className="text-right">Full Coverage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bundle.cohorts.slice(0, 18).map((c) => (
                <TableRow key={c.cohort_month ?? "null"}>
                  <TableCell className="font-mono text-xs">{c.cohort_month?.slice(0, 7) ?? "—"}</TableCell>
                  <TableCell className="text-right">{c.partners_in_cohort}</TableCell>
                  <TableCell className="text-right">{c.active_partners}</TableCell>
                  <TableCell className="text-right">{c.active_clients}</TableCell>
                  <TableCell className="text-right">{formatUsd(c.avg_recurring_value_proxy_usd)}</TableCell>
                  <TableCell className="text-right">{formatUsd(c.sum_recurring_value_proxy_usd)}</TableCell>
                  <TableCell className="text-right">{formatPct(c.avg_partial_margin_pct)}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {c.partners_with_full_coverage} / {c.partners_in_cohort}
                  </TableCell>
                </TableRow>
              ))}
              {bundle.cohorts.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No cohort data.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
