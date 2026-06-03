/**
 * Phase 36 — Forecast Accuracy & Calibration Panel
 *
 * Closes the loop between forecasts and actuals:
 *   - capture/list forecast_snapshots
 *   - forecast vs actual movement variance per past completed month
 *   - stage performance: configured vs realized win rate per deal_type
 *   - assumption performance: configured vs realized churn / expansion / new biz
 *   - guided, optional calibration suggestions (no auto-apply)
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Camera, Info, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  fetchForecastSnapshots,
  captureForecastSnapshot,
  fetchForecastVsActuals,
  fetchStagePerformance,
  fetchAssumptionPerformance,
  buildSuggestions,
  type ForecastSnapshot,
  type ForecastVsActualRow,
  type StagePerformanceRow,
  type AssumptionPerformanceRow,
} from "@/lib/governance/forecastCalibration";

const fmtUsd = (n: number | null | undefined) =>
  n == null ? "—" : `${n < 0 ? "−" : ""}$${Math.abs(Math.round(Number(n))).toLocaleString()}`;
const fmtPct = (n: number | null | undefined) =>
  n == null ? "—" : `${(Number(n) * 100).toFixed(1)}%`;

export function ForecastCalibrationPanel() {
  const [loading, setLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<ForecastSnapshot[]>([]);
  const [snapshotId, setSnapshotId] = useState<string | "all">("all");
  const [actuals, setActuals] = useState<ForecastVsActualRow[]>([]);
  const [stages, setStages] = useState<StagePerformanceRow[]>([]);
  const [assumptions, setAssumptions] = useState<AssumptionPerformanceRow | null>(null);
  const [label, setLabel] = useState("");
  const [capturing, setCapturing] = useState(false);

  async function load() {
    setLoading(true);
    const [snaps, va, sp, ap] = await Promise.all([
      fetchForecastSnapshots(),
      fetchForecastVsActuals(snapshotId === "all" ? undefined : snapshotId),
      fetchStagePerformance(),
      fetchAssumptionPerformance(),
    ]);
    setSnapshots(snaps);
    setActuals(va);
    setStages(sp);
    setAssumptions(ap);
    setLoading(false);
  }

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [snapshotId]);

  async function onCapture() {
    setCapturing(true);
    const id = await captureForecastSnapshot(label.trim() || undefined);
    setCapturing(false);
    if (!id) { toast.error("Could not capture snapshot"); return; }
    toast.success("Snapshot captured");
    setLabel("");
    await load();
  }

  const suggestions = useMemo(() => buildSuggestions(stages, assumptions), [stages, assumptions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          Calibration loop. Snapshots freeze the current forecast (assumptions,
          probabilities, assembled trajectory) so it can be compared to canonical
          actuals once those months close. Suggestions are advisory only; apply
          them via the Assumptions / Stage probabilities tabs.
        </p>
      </div>

      <Tabs defaultValue="vs-actuals">
        <TabsList>
          <TabsTrigger value="vs-actuals">Forecast vs Actuals</TabsTrigger>
          <TabsTrigger value="stages">Stage performance</TabsTrigger>
          <TabsTrigger value="assumptions">Assumption performance</TabsTrigger>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          <TabsTrigger value="snapshots">Snapshots</TabsTrigger>
        </TabsList>

        <TabsContent value="vs-actuals" className="space-y-3">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Variance per completed month</CardTitle>
              <select
                className="text-xs border rounded px-2 py-1 bg-background"
                value={snapshotId}
                onChange={(e) => setSnapshotId(e.target.value as any)}
              >
                <option value="all">All snapshots</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {new Date(s.generated_at).toLocaleDateString()} {s.label ? `· ${s.label}` : ""}
                  </option>
                ))}
              </select>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {actuals.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">
                  No completed months covered by snapshots yet. Capture a snapshot now;
                  variance becomes available after the first horizon month closes.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-muted/40">
                    <tr className="text-left">
                      <th className="p-2">Snapshot</th>
                      <th className="p-2">Period</th>
                      <th className="p-2 text-right">F. new biz</th>
                      <th className="p-2 text-right">A. new biz</th>
                      <th className="p-2 text-right">Δ%</th>
                      <th className="p-2 text-right">F. churn</th>
                      <th className="p-2 text-right">A. churn</th>
                      <th className="p-2 text-right">Δ%</th>
                      <th className="p-2 text-right">F. exp.</th>
                      <th className="p-2 text-right">A. exp.</th>
                      <th className="p-2 text-right">Δ%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actuals.map((r, i) => (
                      <tr key={`${r.snapshot_id}-${r.period}-${i}`} className="border-t">
                        <td className="p-2 text-muted-foreground">
                          {r.snapshot_label || new Date(r.generated_at).toLocaleDateString()}
                        </td>
                        <td className="p-2 font-medium">{r.period}</td>
                        <td className="p-2 text-right">{fmtUsd(r.forecast_new_business)}</td>
                        <td className="p-2 text-right">{fmtUsd(r.actual_new_business)}</td>
                        <td className="p-2 text-right">{fmtPct(r.pct_variance_new_business)}</td>
                        <td className="p-2 text-right">{fmtUsd(r.forecast_churn)}</td>
                        <td className="p-2 text-right">{fmtUsd(r.actual_churn)}</td>
                        <td className="p-2 text-right">{fmtPct(r.pct_variance_churn)}</td>
                        <td className="p-2 text-right">{fmtUsd(r.forecast_expansion)}</td>
                        <td className="p-2 text-right">{fmtUsd(r.actual_net_expansion)}</td>
                        <td className="p-2 text-right">{fmtPct(r.pct_variance_expansion)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stages">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Configured vs realized win rate (180d)</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="p-2">Deal type</th>
                    <th className="p-2 text-right">Avg configured</th>
                    <th className="p-2 text-right">Realized</th>
                    <th className="p-2 text-right">Δ</th>
                    <th className="p-2 text-right">Sample (won/lost)</th>
                  </tr>
                </thead>
                <tbody>
                  {stages.map((s) => (
                    <tr key={s.deal_type} className="border-t">
                      <td className="p-2 capitalize">{s.deal_type}</td>
                      <td className="p-2 text-right">{fmtPct(s.avg_configured_probability)}</td>
                      <td className="p-2 text-right">{fmtPct(s.realized_win_rate)}</td>
                      <td className="p-2 text-right">
                        {s.calibration_delta == null ? "—" : (
                          <span className={s.calibration_delta > 0 ? "text-emerald-600" : "text-red-600"}>
                            {(s.calibration_delta * 100).toFixed(1)}pp
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-right">
                        {s.sample_size} ({s.won_count}/{s.lost_count})
                        {s.sample_size < 10 && (
                          <Badge variant="outline" className="ml-2 text-[10px]">low n</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assumptions">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Configured vs realized assumptions (last 6 closed months)</CardTitle></CardHeader>
            <CardContent>
              {!assumptions ? (
                <p className="text-sm text-muted-foreground">No assumption data yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <KpiBox label="Monthly churn rate"
                    configured={fmtPct(assumptions.configured_churn_rate)}
                    realized={fmtPct(assumptions.realized_churn_rate)}
                    delta={assumptions.churn_calibration_delta == null ? "—" : `${(assumptions.churn_calibration_delta * 100).toFixed(2)}pp`} />
                  <KpiBox label="Monthly expansion rate"
                    configured={fmtPct(assumptions.configured_expansion_rate)}
                    realized={fmtPct(assumptions.realized_expansion_rate)}
                    delta={assumptions.expansion_calibration_delta == null ? "—" : `${(assumptions.expansion_calibration_delta * 100).toFixed(2)}pp`} />
                  <KpiBox label="New biz MRR / month"
                    configured={fmtUsd(assumptions.configured_new_biz_total)}
                    realized={fmtUsd(assumptions.realized_avg_new_biz)}
                    delta={fmtUsd(assumptions.new_biz_calibration_delta)} />
                  <p className="text-xs text-muted-foreground md:col-span-3">
                    Sample: {assumptions.sample_months} closed months. Realized rates use canonical
                    v_subscription_movements over current active known MRR.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suggestions">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Suggestions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {suggestions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No actionable drift detected. Configured values look aligned with realized data.</p>
              ) : (
                suggestions.map((s, i) => (
                  <div key={i} className="border rounded-md p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm">
                        {s.scope === "stage" ? "Stage probability" : "Assumption"} · {s.target}
                      </div>
                      <Badge variant={s.confidence === "high" ? "default" : s.confidence === "medium" ? "secondary" : "outline"} className="text-[10px]">
                        {s.confidence === "low" && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {s.confidence} confidence
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Configured <strong>{typeof s.configured === "number" && s.configured < 1 ? fmtPct(s.configured) : fmtUsd(s.configured)}</strong>
                      {" → "}realized <strong>{typeof s.realized === "number" && s.realized < 1 ? fmtPct(s.realized) : fmtUsd(s.realized)}</strong>
                      {" → "}suggested <strong>{typeof s.suggested === "number" && s.suggested < 1 && s.scope === "stage" ? s.suggested.toFixed(2) : (s.scope === "assumption" && s.target.startsWith("new_business") ? fmtUsd(s.suggested) : fmtPct(s.suggested))}</strong>
                    </div>
                    <div className="text-xs">{s.rationale}</div>
                  </div>
                ))
              )}
              <p className="text-xs text-muted-foreground pt-2 border-t">
                Suggestions move halfway toward realized values. Apply manually via Assumptions / Stage probabilities tabs.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="snapshots" className="space-y-3">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Capture snapshot</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[200px]">
                <Input placeholder="Optional label (e.g. Q2 board forecast)" value={label} onChange={(e) => setLabel(e.target.value)} />
              </div>
              <Button onClick={onCapture} disabled={capturing}>
                {capturing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
                Capture now
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">History</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {snapshots.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">No snapshots captured yet.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-muted/40">
                    <tr className="text-left">
                      <th className="p-2">Captured</th>
                      <th className="p-2">Label</th>
                      <th className="p-2">Horizon</th>
                      <th className="p-2">Source</th>
                      <th className="p-2">Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshots.map((s) => (
                      <tr key={s.id} className="border-t">
                        <td className="p-2">{new Date(s.generated_at).toLocaleString()}</td>
                        <td className="p-2">{s.label ?? "—"}</td>
                        <td className="p-2">{s.horizon_start} → {s.horizon_end}</td>
                        <td className="p-2 capitalize">{s.source}</td>
                        <td className="p-2 font-mono text-[10px]">{s.parameters_hash.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiBox({ label, configured, realized, delta }: { label: string; configured: string; realized: string; delta: string }) {
  return (
    <div className="border rounded-md p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
        <div><div className="text-[10px] uppercase text-muted-foreground">Configured</div><div className="font-semibold">{configured}</div></div>
        <div><div className="text-[10px] uppercase text-muted-foreground">Realized</div><div className="font-semibold">{realized}</div></div>
        <div><div className="text-[10px] uppercase text-muted-foreground">Δ</div><div className="font-semibold">{delta}</div></div>
      </div>
    </div>
  );
}
