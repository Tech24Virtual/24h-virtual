/**
 * Phase 38 — Period Close / RevOps Snapshots admin UI.
 * Read-only listing + detail of revops_period_snapshots with a capture action.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Camera, FileArchive, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  captureRevopsSnapshot,
  defaultPeriodForToday,
  deleteRevopsSnapshot,
  fetchSnapshotCapacity,
  fetchSnapshotForecastVsActuals,
  fetchSnapshotPipeline,
  formatPct,
  formatUsd,
  listRevopsSnapshots,
  type RevopsPeriodSnapshot,
  type SnapshotCapacityRow,
  type SnapshotForecastVsActualRow,
  type SnapshotPipelineRow,
} from "@/lib/governance/revopsSnapshots";

export function RevopsSnapshotsPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<RevopsPeriodSnapshot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pipeline, setPipeline] = useState<SnapshotPipelineRow[]>([]);
  const [capacity, setCapacity] = useState<SnapshotCapacityRow[]>([]);
  const [variance, setVariance] = useState<SnapshotForecastVsActualRow[]>([]);
  const [capturing, setCapturing] = useState(false);

  const def = useMemo(() => defaultPeriodForToday(), []);
  const [periodStart, setPeriodStart] = useState(def.start);
  const [periodEnd, setPeriodEnd] = useState(def.end);
  const [label, setLabel] = useState(def.label);
  const [notes, setNotes] = useState("");
  const [forecastSnapshotId, setForecastSnapshotId] = useState("");
  const [boardPackRef, setBoardPackRef] = useState("");
  const [force, setForce] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const rows = await listRevopsSnapshots();
      setSnapshots(rows);
      if (rows.length && !selectedId) setSelectedId(rows[0].id);
    } catch (e: any) {
      toast({ title: "Failed to load snapshots", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  useEffect(() => {
    if (!selectedId) return;
    Promise.all([
      fetchSnapshotPipeline(selectedId),
      fetchSnapshotCapacity(selectedId),
      fetchSnapshotForecastVsActuals(selectedId),
    ])
      .then(([p, c, v]) => { setPipeline(p); setCapacity(c); setVariance(v); })
      .catch((e) => toast({ title: "Failed to load detail", description: e.message, variant: "destructive" }));
  }, [selectedId]);

  const onCapture = async () => {
    setCapturing(true);
    try {
      const id = await captureRevopsSnapshot({
        period_start: periodStart,
        period_end: periodEnd,
        label: label || null,
        notes: notes || null,
        forecast_snapshot_id: forecastSnapshotId || null,
        board_pack_ref: boardPackRef || null,
        force,
      });
      toast({ title: "Snapshot captured", description: `Label: ${label || periodStart}` });
      setSelectedId(id);
      await reload();
    } catch (e: any) {
      toast({ title: "Capture failed", description: e.message, variant: "destructive" });
    } finally {
      setCapturing(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this snapshot? This action is intended for mistakes only.")) return;
    try {
      await deleteRevopsSnapshot(id);
      if (selectedId === id) setSelectedId(null);
      await reload();
      toast({ title: "Snapshot deleted" });
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const selected = snapshots.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex items-start gap-3 py-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>RevOps period close — not GAAP financial close.</strong> Snapshots freeze
            canonical metric values, pipeline, forecast linkage, and capacity gaps as known
            at capture time. Historical metrics in the source views are never overwritten.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4" /> Capture Period Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Period start</Label>
              <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div>
              <Label>Period end</Label>
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
            <div>
              <Label>Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="2026-05" />
            </div>
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional context" />
            </div>
            <div>
              <Label>Linked forecast snapshot id</Label>
              <Input value={forecastSnapshotId} onChange={(e) => setForecastSnapshotId(e.target.value)} placeholder="optional uuid" />
            </div>
            <div className="md:col-span-2">
              <Label>Linked board-pack reference</Label>
              <Input value={boardPackRef} onChange={(e) => setBoardPackRef(e.target.value)} placeholder="e.g. board_pack/2026-05.pdf" />
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
                Force re-capture
              </label>
              <Button onClick={onCapture} disabled={capturing}>
                {capturing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Capture Snapshot"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Snapshots</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : snapshots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No snapshots captured yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Captured</TableHead>
                  <TableHead className="text-right">Ending MRR</TableHead>
                  <TableHead className="text-right">Net New</TableHead>
                  <TableHead className="text-right">NRR</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshots.map((s) => (
                  <TableRow
                    key={s.id}
                    data-state={s.id === selectedId ? "selected" : undefined}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(s.id)}
                  >
                    <TableCell className="font-medium">{s.label}</TableCell>
                    <TableCell>{s.period_start_date} → {s.period_end_date}</TableCell>
                    <TableCell>{new Date(s.captured_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{formatUsd(s.ending_mrr_usd)}</TableCell>
                    <TableCell className="text-right">{formatUsd(s.net_new_mrr_usd)}</TableCell>
                    <TableCell className="text-right">{formatPct(s.nrr_pct)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Snapshot detail — {selected.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="metrics">
              <TabsList>
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
                <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
                <TabsTrigger value="capacity">Capacity & GTM</TabsTrigger>
                <TabsTrigger value="variance">Forecast vs Actual</TabsTrigger>
                <TabsTrigger value="links">Links</TabsTrigger>
              </TabsList>

              <TabsContent value="metrics" className="space-y-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <Stat label="Starting MRR" value={formatUsd(selected.starting_mrr_usd)} />
                  <Stat label="Ending MRR" value={formatUsd(selected.ending_mrr_usd)} />
                  <Stat label="Net New MRR" value={formatUsd(selected.net_new_mrr_usd)} />
                  <Stat label="Active Subs" value={selected.ending_active_subs?.toLocaleString() ?? "—"} />
                  <Stat label="New MRR" value={formatUsd(selected.new_mrr_usd)} />
                  <Stat label="Churned MRR" value={formatUsd(selected.churned_mrr_usd)} />
                  <Stat label="Expansion MRR" value={formatUsd(selected.expansion_mrr_usd)} />
                  <Stat label="Contraction MRR" value={formatUsd(selected.contraction_mrr_usd)} />
                  <Stat label="NRR" value={formatPct(selected.nrr_pct)} />
                  <Stat label="GRR" value={formatPct(selected.grr_pct)} />
                  <Stat label="Direct MRR" value={formatUsd(selected.direct_mrr_usd)} />
                  <Stat label="WL Recurring (proxy)" value={formatUsd(selected.wl_recurring_proxy_usd)} />
                </div>
              </TabsContent>

              <TabsContent value="pipeline">
                {pipeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pipeline rows captured.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bucket</TableHead>
                        <TableHead>Deal Type</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pipeline.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell>{p.bucket}</TableCell>
                          <TableCell>{p.deal_type ?? "—"}</TableCell>
                          <TableCell>{p.stage ?? "—"}</TableCell>
                          <TableCell className="text-right">{p.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="capacity">
                {capacity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No capacity rows captured for this period.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Scope</TableHead>
                        <TableHead>Function</TableHead>
                        <TableHead className="text-right">Demand</TableHead>
                        <TableHead className="text-right">Supply</TableHead>
                        <TableHead className="text-right">Gap</TableHead>
                        <TableHead className="text-right">Over/Under %</TableHead>
                        <TableHead className="text-right">GTM Target</TableHead>
                        <TableHead className="text-right">GTM Forecast</TableHead>
                        <TableHead className="text-right">GTM Var %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {capacity.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell>{c.scope}</TableCell>
                          <TableCell>{c.function}</TableCell>
                          <TableCell className="text-right">{c.demand?.toFixed(1) ?? "—"}</TableCell>
                          <TableCell className="text-right">{c.current_supply?.toFixed(1) ?? "—"}</TableCell>
                          <TableCell className="text-right">{c.gap_now?.toFixed(1) ?? "—"}</TableCell>
                          <TableCell className="text-right">{formatPct(c.over_under_pct)}</TableCell>
                          <TableCell className="text-right">{formatUsd(c.gtm_target_new_mrr)}</TableCell>
                          <TableCell className="text-right">{formatUsd(c.gtm_forecast_new_mrr)}</TableCell>
                          <TableCell className="text-right">{formatPct(c.gtm_variance_pct)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="variance">
                {variance.length === 0 || !selected.linked_forecast_snapshot_id ? (
                  <p className="text-sm text-muted-foreground">
                    No forecast snapshot linked, or no overlapping completed month available.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Forecast Ending MRR</TableHead>
                        <TableHead className="text-right">Forecast New Biz</TableHead>
                        <TableHead className="text-right">Actual New Biz</TableHead>
                        <TableHead className="text-right">Variance %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variance.map((v, i) => (
                        <TableRow key={i}>
                          <TableCell>{v.period ?? "—"}</TableCell>
                          <TableCell className="text-right">{formatUsd(v.forecast_ending_mrr)}</TableCell>
                          <TableCell className="text-right">{formatUsd(v.forecast_new_business)}</TableCell>
                          <TableCell className="text-right">{formatUsd(v.actual_new_business)}</TableCell>
                          <TableCell className="text-right">{formatPct(v.pct_variance_new_business)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="links" className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <FileArchive className="h-4 w-4" />
                  <span>Forecast snapshot:</span>
                  <code className="text-xs">{selected.linked_forecast_snapshot_id ?? "—"}</code>
                </div>
                <div className="flex items-center gap-2">
                  <FileArchive className="h-4 w-4" />
                  <span>Board pack reference:</span>
                  <code className="text-xs">{selected.linked_board_pack_ref ?? "—"}</code>
                </div>
                {selected.notes && (
                  <p className="pt-2 text-muted-foreground">Notes: {selected.notes}</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}

export default RevopsSnapshotsPanel;
