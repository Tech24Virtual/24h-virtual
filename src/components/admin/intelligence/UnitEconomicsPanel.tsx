/**
 * Phase 19 — Unit Economics (CAC / LTV / Payback) admin panel.
 * Admin-only. Honest about coverage; missing inputs render as "—" with flags.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calculator, AlertTriangle } from "lucide-react";
import {
  fetchUnitEconomicsBundle,
  ltvCacRatio,
  coverageLabel,
  formatUsd,
  formatMonths,
  formatRatio,
  type UnitEconomicsBundle,
  type UnitEconCoverageFlag,
} from "@/lib/governance/unitEconomics";
import { channelLabel } from "@/lib/governance/growthIntelligence";

const flagVariant = (flag: UnitEconCoverageFlag): "default" | "secondary" | "outline" =>
  flag === "ok" ? "default" : flag === "lifetime_insufficient" ? "secondary" : "outline";

export default function UnitEconomicsPanel() {
  const [bundle, setBundle] = useState<UnitEconomicsBundle | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchUnitEconomicsBundle()
      .then((b) => { if (!cancelled) setBundle(b); })
      .catch(() => { if (!cancelled) setBundle(null); });
    return () => { cancelled = true; };
  }, []);

  if (bundle === undefined) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (bundle === null) {
    return <p className="text-sm text-muted-foreground">Unable to load unit economics.</p>;
  }

  const channels = [...bundle.channels].sort(
    (a, b) => (b.conversions_total ?? 0) - (a.conversions_total ?? 0),
  );

  return (
    <div className="space-y-6">
      <Card className="border-amber-500/30 bg-amber-50/40 dark:bg-amber-500/5">
        <CardContent className="pt-6 flex gap-3 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
          <div>
            CAC is derived only from approved/paid sales commissions; channels with no recorded
            commissions show as <em>cost_unknown</em>. LTV requires at least 3 observed churn events
            in scope, otherwise it is omitted. WL CAC excludes partner-side acquisition cost. These
            metrics are guidance, not accounting.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" /> Unit Economics by Channel
          </CardTitle>
          <CardDescription>CAC, LTV, LTV:CAC, payback months. Sorted by conversion volume.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead className="text-right">Conversions</TableHead>
                <TableHead className="text-right">CAC</TableHead>
                <TableHead className="text-right">Avg MRR</TableHead>
                <TableHead className="text-right">LTV</TableHead>
                <TableHead className="text-right">LTV:CAC</TableHead>
                <TableHead className="text-right">Payback</TableHead>
                <TableHead>Coverage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No channel data.</TableCell></TableRow>
              )}
              {channels.map((c) => (
                <TableRow key={c.channel}>
                  <TableCell className="font-medium">{channelLabel(c.channel)}</TableCell>
                  <TableCell className="text-right">{c.conversions_total}</TableCell>
                  <TableCell className="text-right">{formatUsd(c.cac_usd)}</TableCell>
                  <TableCell className="text-right">{formatUsd(c.avg_known_mrr_usd)}</TableCell>
                  <TableCell className="text-right">{formatUsd(c.ltv_usd)}</TableCell>
                  <TableCell className="text-right">{formatRatio(ltvCacRatio(c))}</TableCell>
                  <TableCell className="text-right">{formatMonths(c.payback_months)}</TableCell>
                  <TableCell>
                    <Badge variant={flagVariant(c.coverage_flag)} className="text-xs">
                      {coverageLabel(c.coverage_flag)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Direct vs White Label</CardTitle>
          <CardDescription>Side-by-side unit economics across acquisition motions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stream</TableHead>
                <TableHead className="text-right">Conversions</TableHead>
                <TableHead className="text-right">CAC</TableHead>
                <TableHead className="text-right">Avg MRR</TableHead>
                <TableHead className="text-right">LTV</TableHead>
                <TableHead className="text-right">LTV:CAC</TableHead>
                <TableHead className="text-right">Payback</TableHead>
                <TableHead>Coverage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bundle.directVsWl.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No data.</TableCell></TableRow>
              )}
              {bundle.directVsWl.map((r) => (
                <TableRow key={r.acquisition_type}>
                  <TableCell className="font-medium uppercase">{r.acquisition_type}</TableCell>
                  <TableCell className="text-right">{r.conversions_total}</TableCell>
                  <TableCell className="text-right">{formatUsd(r.cac_usd)}</TableCell>
                  <TableCell className="text-right">{formatUsd(r.avg_known_mrr_usd)}</TableCell>
                  <TableCell className="text-right">{formatUsd(r.ltv_usd)}</TableCell>
                  <TableCell className="text-right">{formatRatio(ltvCacRatio(r))}</TableCell>
                  <TableCell className="text-right">{formatMonths(r.payback_months)}</TableCell>
                  <TableCell>
                    <Badge variant={flagVariant(r.coverage_flag)} className="text-xs">
                      {coverageLabel(r.coverage_flag)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cohort CAC + Payback</CardTitle>
          <CardDescription>By lead cohort month. LTV omitted at cohort grain (insufficient churn observations).</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cohort</TableHead>
                <TableHead className="text-right">Conversions</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">CAC</TableHead>
                <TableHead className="text-right">Avg MRR</TableHead>
                <TableHead className="text-right">Payback</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bundle.cohorts.slice(0, 12).map((c) => (
                <TableRow key={c.cohort_month}>
                  <TableCell className="font-mono text-xs">{c.cohort_month?.slice(0, 7)}</TableCell>
                  <TableCell className="text-right">{c.conversions_total}</TableCell>
                  <TableCell className="text-right">{formatUsd(c.total_known_cost_usd)}</TableCell>
                  <TableCell className="text-right">{formatUsd(c.cac_usd)}</TableCell>
                  <TableCell className="text-right">{formatUsd(c.avg_known_mrr_usd)}</TableCell>
                  <TableCell className="text-right">{formatMonths(c.payback_months)}</TableCell>
                </TableRow>
              ))}
              {bundle.cohorts.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No cohort data.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
