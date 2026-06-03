/**
 * Phase 35 — Revenue Forecasting from Canonical Pipelines.
 *
 * Admin-only panel that composes the v_forecast_assembled view with the
 * forecast_assumptions + forecast_stage_probabilities tables. Every number
 * is decomposed into base, renewals, expansions, and new business so an
 * operator can explain it.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Info, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  fetchAssembledForecast,
  fetchForecastAssumptions,
  updateForecastAssumptions,
  fetchStageProbabilities,
  updateStageProbability,
  renewalCoverageRatio,
  type AssembledForecastRow,
  type ForecastAssumptions,
  type StageProbability,
} from "@/lib/governance/forecastingPipeline";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar,
} from "recharts";

const fmtUsd = (n: number | null | undefined) =>
  n == null ? "—" : `$${Math.round(Number(n)).toLocaleString()}`;
const fmtPct = (n: number | null | undefined) =>
  n == null ? "—" : `${(Number(n) * 100).toFixed(2)}%`;

export function RevenueForecastPanel() {
  const [horizon, setHorizon] = useState<6 | 12>(12);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AssembledForecastRow[]>([]);
  const [assumptions, setAssumptions] = useState<ForecastAssumptions | null>(null);
  const [probs, setProbs] = useState<StageProbability[]>([]);
  const [savingA, setSavingA] = useState(false);

  // local edit buffers
  const [aChurn, setAChurn] = useState<string>("");
  const [aExp, setAExp] = useState<string>("");
  const [aDirect, setADirect] = useState<string>("");
  const [aWl, setAWl] = useState<string>("");

  async function load() {
    setLoading(true);
    const [r, a, p] = await Promise.all([
      fetchAssembledForecast(),
      fetchForecastAssumptions(),
      fetchStageProbabilities(),
    ]);
    setRows(r);
    setAssumptions(a);
    setProbs(p);
    if (a) {
      setAChurn(String(a.baseline_monthly_churn_rate));
      setAExp(String(a.baseline_monthly_expansion_rate));
      setADirect(String(a.new_business_mrr_direct));
      setAWl(String(a.new_business_mrr_wl));
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const horizonRows = useMemo(() => rows.filter((r) => r.month_index <= horizon), [rows, horizon]);

  const chartData = useMemo(() => horizonRows.map((r) => ({
    period: r.period,
    Base: Number(r.projected_base_mrr ?? 0),
    "New business": Number(r.new_business_mrr ?? 0),
    Expansion: Number(r.baseline_expansion_amount ?? 0),
    Churn: -Number(r.baseline_churn_amount ?? 0),
    Ending: Number(r.projected_ending_mrr ?? 0),
  })), [horizonRows]);

  async function saveAssumptions() {
    setSavingA(true);
    const ok = await updateForecastAssumptions({
      baseline_monthly_churn_rate: Number(aChurn) || 0,
      baseline_monthly_expansion_rate: Number(aExp) || 0,
      new_business_mrr_direct: Number(aDirect) || 0,
      new_business_mrr_wl: Number(aWl) || 0,
    });
    setSavingA(false);
    if (!ok) { toast.error("Could not save assumptions"); return; }
    toast.success("Assumptions saved");
    await load();
  }

  async function saveProb(id: string, value: string) {
    const v = Math.max(0, Math.min(1, Number(value)));
    if (Number.isNaN(v)) return;
    const ok = await updateStageProbability(id, v);
    if (!ok) toast.error("Could not save probability");
    else { toast.success("Probability updated"); await load(); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2 text-xs text-muted-foreground max-w-2xl">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            <strong>Recurring revenue forecast</strong> only. Base MRR carries
            current active subscriptions forward with baseline churn / expansion
            assumptions; new business is added as a flat monthly assumption;
            renewal &amp; expansion deals contribute as <em>weighted counts</em>
            (not weighted dollars) in v1. Not GAAP revenue, not bookings.
          </p>
        </div>
        <Tabs value={String(horizon)} onValueChange={(v) => setHorizon(Number(v) as 6 | 12)}>
          <TabsList>
            <TabsTrigger value="6">6 months</TabsTrigger>
            <TabsTrigger value="12">12 months</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs defaultValue="trajectory">
        <TabsList>
          <TabsTrigger value="trajectory">Trajectory</TabsTrigger>
          <TabsTrigger value="components">Monthly components</TabsTrigger>
          <TabsTrigger value="renewals">Renewal coverage</TabsTrigger>
          <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
          <TabsTrigger value="probabilities">Stage probabilities</TabsTrigger>
        </TabsList>

        <TabsContent value="trajectory" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Projected MRR vs current
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => fmtUsd(v as number)} />
                    <Legend />
                    <Line type="monotone" dataKey="Base" stroke="hsl(var(--muted-foreground))" dot={false} />
                    <Line type="monotone" dataKey="Ending" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Component breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} stackOffset="sign">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => fmtUsd(v as number)} />
                    <Legend />
                    <Bar dataKey="New business" stackId="s" fill="hsl(var(--primary))" />
                    <Bar dataKey="Expansion" stackId="s" fill="hsl(142 70% 45%)" />
                    <Bar dataKey="Churn" stackId="s" fill="hsl(0 70% 55%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="p-2">Period</th>
                    <th className="p-2 text-right">Base MRR</th>
                    <th className="p-2 text-right">Churn</th>
                    <th className="p-2 text-right">Baseline exp.</th>
                    <th className="p-2 text-right">New biz</th>
                    <th className="p-2 text-right">Ending MRR</th>
                    <th className="p-2 text-right">Renewals due</th>
                    <th className="p-2 text-right">Wt. renewed</th>
                    <th className="p-2 text-right">Wt. expansion</th>
                  </tr>
                </thead>
                <tbody>
                  {horizonRows.map((r) => (
                    <tr key={r.period} className="border-t">
                      <td className="p-2 font-medium">{r.period}</td>
                      <td className="p-2 text-right">{fmtUsd(r.projected_base_mrr)}</td>
                      <td className="p-2 text-right text-red-600">−{fmtUsd(r.baseline_churn_amount)}</td>
                      <td className="p-2 text-right text-emerald-600">+{fmtUsd(r.baseline_expansion_amount)}</td>
                      <td className="p-2 text-right text-emerald-600">+{fmtUsd(r.new_business_mrr)}</td>
                      <td className="p-2 text-right font-semibold">{fmtUsd(r.projected_ending_mrr)}</td>
                      <td className="p-2 text-right">{r.renewals_due ?? 0}</td>
                      <td className="p-2 text-right">{Number(r.weighted_expected_renewed_count ?? 0).toFixed(2)}</td>
                      <td className="p-2 text-right">{Number(r.weighted_expansion_count ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="renewals">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Weighted renewal coverage by month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mb-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  Coverage = weighted expected renewed accounts / renewals due. Healthy
                  renewal programs typically aim for 1.5x to 2.0x. Workflows linked to
                  an open deal use the deal's stage probability; unlinked workflows
                  fall back to a baseline 0.85.
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {horizonRows.map((r) => {
                  const ratio = renewalCoverageRatio(r);
                  const tone = ratio == null ? "outline"
                    : ratio >= 1.5 ? "default"
                    : ratio >= 1.0 ? "secondary"
                    : "destructive";
                  return (
                    <Card key={r.period}>
                      <CardContent className="p-3 space-y-1">
                        <div className="text-xs text-muted-foreground">{r.period}</div>
                        <div className="text-2xl font-bold">{ratio == null ? "—" : ratio.toFixed(2) + "x"}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.renewals_due ?? 0} due · wt {Number(r.weighted_expected_renewed_count ?? 0).toFixed(2)}
                        </div>
                        <Badge variant={tone as any} className="text-[10px]">
                          {ratio == null ? "no renewals" : ratio >= 1.5 ? "healthy" : ratio >= 1.0 ? "watch" : "at risk"}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assumptions">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Forecast assumptions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Baseline monthly churn rate</Label>
                  <Input type="number" step="0.001" value={aChurn} onChange={(e) => setAChurn(e.target.value)} />
                  <p className="text-xs text-muted-foreground">e.g. 0.025 = 2.5% / month. Currently {fmtPct(assumptions?.baseline_monthly_churn_rate ?? 0)}.</p>
                </div>
                <div className="space-y-1">
                  <Label>Baseline monthly expansion rate</Label>
                  <Input type="number" step="0.001" value={aExp} onChange={(e) => setAExp(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Applied to base MRR. Currently {fmtPct(assumptions?.baseline_monthly_expansion_rate ?? 0)}.</p>
                </div>
                <div className="space-y-1">
                  <Label>New business MRR / month (Direct)</Label>
                  <Input type="number" step="100" value={aDirect} onChange={(e) => setADirect(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>New business MRR / month (White Label)</Label>
                  <Input type="number" step="100" value={aWl} onChange={(e) => setAWl(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveAssumptions} disabled={savingA}>
                  {savingA ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Save assumptions
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="probabilities">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Stage probabilities</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="p-2">Deal type</th>
                    <th className="p-2">Stage</th>
                    <th className="p-2 w-32">Probability</th>
                  </tr>
                </thead>
                <tbody>
                  {probs.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-2 capitalize">{p.deal_type}</td>
                      <td className="p-2 font-mono">{p.stage}</td>
                      <td className="p-2">
                        <Input
                          type="number"
                          step="0.05"
                          min="0"
                          max="1"
                          defaultValue={p.probability}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (v !== Number(p.probability)) void saveProb(p.id, e.target.value);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
