/**
 * Phase 18 — Executive Finance / Board Metrics Layer
 *
 * Admin-only board-style finance surface. Composes the Phase 17 canonical
 * subscription substrate into MRR spine, MRR bridge, retention rates,
 * direct-vs-WL economics, and plan contribution. No new metric definitions.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Repeat,
  PieChart as PieIcon,
  Scale,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchExecutiveFinanceBundle,
  formatPct,
  formatUsd,
  latest,
  type ExecutiveFinanceBundle,
} from "@/lib/governance/executiveFinance";

export default function ExecutiveFinancePanel() {
  const [bundle, setBundle] = useState<ExecutiveFinanceBundle | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchExecutiveFinanceBundle()
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
          Executive finance views are unavailable in this context.
        </CardContent>
      </Card>
    );
  }

  const latestSpine = latest(bundle.spine);
  const latestBridge = latest(bundle.bridge);
  const latestRetention = latest(bundle.retention);
  const direct = bundle.directVsWl.find((r) => r.stream === "direct");
  const wl = bundle.directVsWl.find((r) => r.stream === "wl");

  const trendData = bundle.spine.map((r) => ({
    month: r.month_start.slice(0, 7),
    mrr: Number(r.ending_mrr_usd) || 0,
    churn:
      Number(
        bundle.bridge.find((b) => b.month_start === r.month_start)?.churned_mrr_usd ?? 0
      ) || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Honesty banner */}
      <Card className="border-dashed">
        <CardContent className="py-4 text-xs text-muted-foreground space-y-1">
          <p>
            <strong>Board-grade truth, not theatre.</strong> All metrics inherit Phase 17 honesty: MRR
            comes only from canonical custom plans, churn means an explicit transition to
            churned/lost, and WL recurring is a labeled 90-day paid-invoice average proxy.
          </p>
          <p>
            Expansion and contraction are <strong>0</strong> until a discrete movement event log exists,
            so GRR equals NRR today. Subscriptions with unknown MRR are excluded from sums rather than
            guessed. CAC, LTV, and full WL unit economics are <strong>not</strong> shown here, by design.
          </p>
        </CardContent>
      </Card>

      {/* Headline KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <KpiTile
          icon={<TrendingUp className="h-4 w-4" />}
          label="Ending MRR (latest)"
          value={formatUsd(latestSpine?.ending_mrr_usd ?? 0)}
          hint={
            latestSpine?.month_start
              ? `as of ${latestSpine.month_start.slice(0, 7)} · ${latestSpine.ending_active_subs} active`
              : undefined
          }
        />
        <KpiTile
          icon={<Repeat className="h-4 w-4" />}
          label="Net new MRR (latest mo)"
          value={formatUsd(latestSpine?.net_new_mrr_usd ?? 0)}
          hint={`new ${formatUsd(latestBridge?.new_mrr_usd ?? 0)} · churn ${formatUsd(latestBridge?.churned_mrr_usd ?? 0)}`}
          tone={(latestSpine?.net_new_mrr_usd ?? 0) >= 0 ? "positive" : "warn"}
        />
        <KpiTile
          icon={<Scale className="h-4 w-4" />}
          label="Gross / Net Revenue Retention"
          value={`${formatPct(latestRetention?.gross_revenue_retention)} / ${formatPct(
            latestRetention?.net_revenue_retention
          )}`}
          hint="GRR = NRR until expansion log lands"
        />
        <KpiTile
          icon={<TrendingDown className="h-4 w-4" />}
          label="Revenue / Logo churn"
          value={`${formatPct(latestRetention?.revenue_churn_rate)} / ${formatPct(
            latestRetention?.logo_churn_rate
          )}`}
          hint="latest month, derived"
          tone={(latestRetention?.revenue_churn_rate ?? 0) > 0.05 ? "warn" : "neutral"}
        />
      </div>

      {/* MRR spine chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">MRR Spine (24 months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatUsd(v)}
                />
                <Area
                  type="monotone"
                  dataKey="mrr"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.15)"
                  strokeWidth={2}
                  name="Ending MRR"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Latest MRR bridge */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            MRR Bridge — {latestBridge?.month_start.slice(0, 7) ?? "—"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
            <BridgeCell label="Starting" value={formatUsd(latestBridge?.starting_mrr_usd ?? 0)} />
            <BridgeCell label="+ New" value={formatUsd(latestBridge?.new_mrr_usd ?? 0)} positive />
            <BridgeCell label="+ Expansion" value={formatUsd(latestBridge?.expansion_mrr_usd ?? 0)} muted />
            <BridgeCell label="− Contraction" value={formatUsd(latestBridge?.contraction_mrr_usd ?? 0)} muted />
            <BridgeCell label="− Churn" value={formatUsd(latestBridge?.churned_mrr_usd ?? 0)} negative />
            <BridgeCell label="= Ending" value={formatUsd(latestBridge?.ending_mrr_usd ?? 0)} bold />
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            Expansion / contraction surface as zero pending a discrete movement event log; not fabricated.
          </p>
        </CardContent>
      </Card>

      {/* Direct vs WL executive summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Direct vs White-Label — Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="text-left py-2 pr-4">Stream</th>
                  <th className="text-right py-2 pr-4">Active</th>
                  <th className="text-right py-2 pr-4">New (30d)</th>
                  <th className="text-right py-2 pr-4">Churn (30d)</th>
                  <th className="text-right py-2 pr-4">Known MRR</th>
                  <th className="text-right py-2 pr-4">WL recurring proxy</th>
                  <th className="text-left py-2">Basis</th>
                </tr>
              </thead>
              <tbody>
                {[direct, wl].filter(Boolean).map((r) => (
                  <tr key={r!.stream} className="border-t">
                    <td className="py-2 pr-4 font-medium uppercase">{r!.stream}</td>
                    <td className="py-2 pr-4 text-right">{r!.active_subs}</td>
                    <td className="py-2 pr-4 text-right">{r!.new_subs_30d}</td>
                    <td className="py-2 pr-4 text-right">
                      {r!.churned_subs_30d} <span className="text-muted-foreground">/ {formatUsd(r!.churned_mrr_30d)}</span>
                    </td>
                    <td className="py-2 pr-4 text-right">{formatUsd(r!.known_mrr_usd)}</td>
                    <td className="py-2 pr-4 text-right">
                      {r!.wl_recurring_proxy_usd === null ? "—" : formatUsd(r!.wl_recurring_proxy_usd)}
                    </td>
                    <td className="py-2 text-muted-foreground text-xs">{r!.basis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Plan contribution */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <PieIcon className="h-4 w-4" /> Plan / Tier Contribution
          </CardTitle>
          <Badge variant="outline">{bundle.planContribution.length} plans</Badge>
        </CardHeader>
        <CardContent>
          {bundle.planContribution.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">No plan contribution data yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="text-left py-2 pr-4">Plan</th>
                    <th className="text-left py-2 pr-4">Stream</th>
                    <th className="text-right py-2 pr-4">Active</th>
                    <th className="text-right py-2 pr-4">Active known MRR</th>
                    <th className="text-right py-2 pr-4">Share of MRR</th>
                    <th className="text-right py-2">Avg MRR / sub</th>
                  </tr>
                </thead>
                <tbody>
                  {bundle.planContribution.slice(0, 20).map((row, i) => (
                    <tr key={`${row.plan_name}-${row.stream}-${i}`} className="border-t">
                      <td className="py-2 pr-4">{row.plan_name ?? "—"}</td>
                      <td className="py-2 pr-4 uppercase text-xs">{row.stream}</td>
                      <td className="py-2 pr-4 text-right">{row.active_count}</td>
                      <td className="py-2 pr-4 text-right">{formatUsd(row.active_known_mrr_usd)}</td>
                      <td className="py-2 pr-4 text-right">{formatPct(row.share_of_known_mrr)}</td>
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

      {/* Retention table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Retention &amp; Churn — Trailing 12 months</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="text-left py-2 pr-4">Month</th>
                  <th className="text-right py-2 pr-4">Starting MRR</th>
                  <th className="text-right py-2 pr-4">Churned MRR</th>
                  <th className="text-right py-2 pr-4">Rev churn</th>
                  <th className="text-right py-2 pr-4">Logo churn</th>
                  <th className="text-right py-2 pr-4">GRR</th>
                  <th className="text-right py-2">NRR</th>
                </tr>
              </thead>
              <tbody>
                {bundle.retention.slice(-12).map((r) => (
                  <tr key={r.month_start} className="border-t">
                    <td className="py-2 pr-4">{r.month_start.slice(0, 7)}</td>
                    <td className="py-2 pr-4 text-right">{formatUsd(r.starting_mrr_usd ?? 0)}</td>
                    <td className="py-2 pr-4 text-right">{formatUsd(r.churned_mrr_usd)}</td>
                    <td className="py-2 pr-4 text-right">{formatPct(r.revenue_churn_rate)}</td>
                    <td className="py-2 pr-4 text-right">{formatPct(r.logo_churn_rate)}</td>
                    <td className="py-2 pr-4 text-right">{formatPct(r.gross_revenue_retention)}</td>
                    <td className="py-2 text-right">{formatPct(r.net_revenue_retention)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[11px] text-muted-foreground mt-2">
              Rates are NULL when starting MRR / starting active subs is 0 (no fabricated denominators).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiTile({
  icon, label, value, hint, tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "positive" | "warn";
}) {
  const toneClass =
    tone === "positive" ? "text-emerald-600" : tone === "warn" ? "text-destructive" : "";
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <div className={`text-2xl font-semibold mt-1 ${toneClass}`}>{value}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function BridgeCell({
  label, value, positive, negative, muted, bold,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
  muted?: boolean;
  bold?: boolean;
}) {
  const cls = positive
    ? "text-emerald-600"
    : negative
    ? "text-destructive"
    : muted
    ? "text-muted-foreground"
    : "";
  return (
    <div className="rounded-md border p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 ${bold ? "font-semibold text-base" : "text-sm"} ${cls}`}>{value}</div>
    </div>
  );
}
