/**
 * Phase 25 — Experiment Ops Panel (admin-only)
 *
 * Decision-engine surface over Phase 23 substrate. Surfaces sample
 * sufficiency, statistical confidence (two-proportion z-test against
 * control via v_experiment_decisions), and operator recommendations.
 * Also hosts saved-scenario management.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, AlertTriangle, Beaker, Save, Archive, Copy, Zap, ShieldAlert } from "lucide-react";
import {
  fetchExperimentDecisions,
  CONFIDENCE_TONE,
  RECOMMENDATION_LABEL,
  formatPct,
  updateExperimentLifecycle,
  type ExperimentDecisionRow,
} from "@/lib/governance/experimentOps";
import {
  fetchSavedScenarios,
  saveScenario,
  archiveScenario,
  duplicateScenario,
  type SavedScenarioRow,
} from "@/lib/governance/savedScenarios";
import { fetchScenarioBundle, SCENARIO_PRESETS, projectScenario, formatUsd } from "@/lib/governance/scenarioModeling";
import {
  fetchExperimentAllocation,
  estimateBanditWeights,
  updateExperimentMethod,
  setKillSwitch,
  ALLOCATION_MODE_LABEL,
  type AllocationExperiment,
  type AllocationMode,
} from "@/lib/governance/banditAllocation";
import { logAuditEvent } from "@/lib/audit";

export default function ExperimentOpsPanel() {
  const [decisions, setDecisions] = useState<ExperimentDecisionRow[]>([]);
  const [scenarios, setScenarios] = useState<SavedScenarioRow[]>([]);
  const [allocations, setAllocations] = useState<AllocationExperiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scenarioLabel, setScenarioLabel] = useState("");

  const refresh = async () => {
    setLoading(true);
    const [d, s, a] = await Promise.all([
      fetchExperimentDecisions(),
      fetchSavedScenarios(),
      fetchExperimentAllocation(),
    ]);
    setDecisions(d); setScenarios(s); setAllocations(a); setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const allocationByExp = useMemo(() => {
    const m = new Map<string, AllocationExperiment>();
    allocations.forEach((a) => m.set(a.experiment_id, a));
    return m;
  }, [allocations]);

  const banditWeights = useMemo(() => {
    const m = new Map<string, Record<string, number>>();
    allocations.forEach((a) => {
      if (a.allocation_mode === "bandit" && !a.kill_switch_active) {
        m.set(a.experiment_id, estimateBanditWeights(a, 800));
      }
    });
    return m;
  }, [allocations]);

  const grouped = useMemo(() => {
    const m = new Map<string, ExperimentDecisionRow[]>();
    decisions.forEach((d) => {
      const arr = m.get(d.experiment_id) ?? [];
      arr.push(d); m.set(d.experiment_id, arr);
    });
    return Array.from(m.entries());
  }, [decisions]);

  const persistBaseScenario = async () => {
    if (!scenarioLabel.trim()) { alert("Label required"); return; }
    setSaving(true);
    try {
      const bundle = await fetchScenarioBundle();
      const out = projectScenario(bundle.baseline, SCENARIO_PRESETS.base, "base", "Saved baseline");
      const row = await saveScenario({
        label: scenarioLabel.trim(),
        baseline: bundle.baseline,
        levers: SCENARIO_PRESETS.base,
        output: out,
        scenario_key: "base",
      });
      if (row) {
        await logAuditEvent({ action: "admin.tool.launched", metadata: { tool: "scenario.saved", scenario_id: row.id } }).catch(() => {});
      }
      setScenarioLabel("");
      refresh();
    } finally { setSaving(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Experiment Ops.</strong> Decisions compose Phase 23 results with sample sufficiency and a
          two-proportion z-test (95% threshold) against the <code>control</code> variant. Insufficient sample is a
          first-class state; recommendations are operator hints, not auto-actions. Admin-only.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Beaker className="h-4 w-4" />Decision engine</CardTitle>
          <CardDescription>{grouped.length} experiments · {decisions.length} variant rows</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {grouped.length === 0 && (
            <p className="text-sm text-muted-foreground">No experiments yet. Create one in Pricing Lab.</p>
          )}
          {grouped.map(([eid, rows]) => {
            const head = rows[0];
            const min = head.min_sample_per_variant;
            const alloc = allocationByExp.get(eid);
            const weights = banditWeights.get(eid);
            return (
              <div key={eid} className="space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{head.experiment_name}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {ALLOCATION_MODE_LABEL[head.allocation_mode]}
                      </Badge>
                      {head.allocation_mode === "bandit" && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Zap className="h-3 w-3 mr-1" />
                          {head.bandit_algorithm}
                        </Badge>
                      )}
                      {head.kill_switch_active && (
                        <Badge variant="destructive" className="text-[10px]">
                          <ShieldAlert className="h-3 w-3 mr-1" />
                          kill switch on
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Status: {head.experiment_status} · Min sample / variant: {min}
                      {head.max_exposure_per_variant != null && ` · Max exposure: ${head.max_exposure_per_variant}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <MethodEditor
                      experimentId={eid}
                      current={{
                        allocation_mode: head.allocation_mode,
                        bandit_algorithm: head.bandit_algorithm,
                        max_exposure_per_variant: head.max_exposure_per_variant,
                        kill_switch_active: head.kill_switch_active,
                      }}
                      onSaved={refresh}
                    />
                    <LifecycleEditor experimentId={eid} currentMin={min} onSaved={refresh} />
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variant</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Conv</TableHead>
                      <TableHead className="text-right">Conv %</TableHead>
                      <TableHead className="text-right">Bandit win %</TableHead>
                      <TableHead className="text-right">vs Control z</TableHead>
                      <TableHead className="text-right">Active MRR</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Recommendation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => {
                      const vk = r.variant_key ?? "";
                      const w = weights ? weights[vk] : undefined;
                      const seqInfo = head.allocation_mode === "sequential" && r.sequential_z_critical
                        ? ` (seq z*≈${r.sequential_z_critical.toFixed(2)})` : "";
                      return (
                        <TableRow key={`${r.experiment_id}-${r.variant_key}`}>
                          <TableCell className="font-medium">{r.variant_key ?? "—"}</TableCell>
                          <TableCell className="text-right">{r.leads_assigned}</TableCell>
                          <TableCell className="text-right">{r.leads_converted}</TableCell>
                          <TableCell className="text-right">{formatPct(r.conversion_rate)}</TableCell>
                          <TableCell className="text-right">{w === undefined ? "—" : `${(w * 100).toFixed(1)}%`}</TableCell>
                          <TableCell className="text-right">{r.z_score === null ? "—" : `${r.z_score.toFixed(2)}${seqInfo}`}</TableCell>
                          <TableCell className="text-right">{formatUsd(r.active_known_mrr_usd)}</TableCell>
                          <TableCell>
                            <Badge variant={CONFIDENCE_TONE[r.confidence_label]} className="text-[10px]">
                              {r.confidence_label.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{RECOMMENDATION_LABEL[r.recommendation]}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Save className="h-4 w-4" />Saved scenarios</CardTitle>
          <CardDescription>
            Persisted planning artifacts. Snapshot baseline + levers + projected output at save time. Not forecasts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Label</Label>
              <Input value={scenarioLabel} onChange={(e) => setScenarioLabel(e.target.value)} placeholder="Q3 baseline snapshot" />
            </div>
            <Button size="sm" onClick={persistBaseScenario} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save current baseline"}
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Preset</TableHead>
                <TableHead className="text-right">12mo ending MRR</TableHead>
                <TableHead className="text-right">Net new MRR</TableHead>
                <TableHead>Saved</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenarios.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-xs">No saved scenarios.</TableCell></TableRow>
              )}
              {scenarios.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.label}</TableCell>
                  <TableCell>{s.scenario_key ?? "custom"}</TableCell>
                  <TableCell className="text-right">{formatUsd(s.output?.endingMrr12mo ?? null)}</TableCell>
                  <TableCell className="text-right">{formatUsd(s.output?.netNewMrr12mo ?? null)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={async () => { await duplicateScenario(s.id, `${s.label} (copy)`); refresh(); }}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={async () => { await archiveScenario(s.id, true); refresh(); }}>
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function LifecycleEditor({ experimentId, currentMin, onSaved }: { experimentId: string; currentMin: number; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [primary, setPrimary] = useState("conversion_rate");
  const [audience, setAudience] = useState("all_visitors");
  const [decisionRule, setDecisionRule] = useState("Promote variant if z >= 1.96 and ≥ min sample reached");
  const [minSample, setMinSample] = useState(currentMin);
  const [busy, setBusy] = useState(false);

  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Edit lifecycle</Button>;

  const save = async () => {
    setBusy(true);
    await updateExperimentLifecycle(experimentId, {
      primary_metric: primary,
      target_audience: audience,
      decision_rule: decisionRule,
      min_sample_per_variant: minSample,
    });
    await logAuditEvent({ action: "admin.tool.launched", target_table: "pricing_experiments", target_id: experimentId, metadata: { tool: "experiment.lifecycle.updated" } }).catch(() => {});
    setBusy(false); setOpen(false); onSaved();
  };

  return (
    <div className="flex items-end gap-2">
      <div className="space-y-1"><Label className="text-[10px]">Primary metric</Label><Input className="h-8 w-40" value={primary} onChange={(e) => setPrimary(e.target.value)} /></div>
      <div className="space-y-1"><Label className="text-[10px]">Audience</Label><Input className="h-8 w-36" value={audience} onChange={(e) => setAudience(e.target.value)} /></div>
      <div className="space-y-1"><Label className="text-[10px]">Min sample</Label><Input type="number" className="h-8 w-24" value={minSample} onChange={(e) => setMinSample(Number(e.target.value))} /></div>
      <div className="space-y-1 flex-1"><Label className="text-[10px]">Decision rule</Label><Input className="h-8" value={decisionRule} onChange={(e) => setDecisionRule(e.target.value)} /></div>
      <Button size="sm" onClick={save} disabled={busy}>Save</Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
    </div>
  );
}

function MethodEditor({
  experimentId,
  current,
  onSaved,
}: {
  experimentId: string;
  current: { allocation_mode: AllocationMode; bandit_algorithm: "thompson" | "ucb1"; max_exposure_per_variant: number | null; kill_switch_active: boolean };
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AllocationMode>(current.allocation_mode);
  const [algo, setAlgo] = useState<"thompson" | "ucb1">(current.bandit_algorithm);
  const [maxExp, setMaxExp] = useState<string>(current.max_exposure_per_variant?.toString() ?? "");
  const [kill, setKill] = useState(current.kill_switch_active);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Method</Button>
        <Button
          size="sm"
          variant={current.kill_switch_active ? "default" : "destructive"}
          onClick={async () => {
            await setKillSwitch(experimentId, !current.kill_switch_active);
            await logAuditEvent({ action: "admin.tool.launched", target_table: "pricing_experiments", target_id: experimentId, metadata: { tool: "experiment.kill_switch.toggled", on: !current.kill_switch_active } }).catch(() => {});
            onSaved();
          }}
        >
          {current.kill_switch_active ? "Resume" : "Kill"}
        </Button>
      </div>
    );
  }

  const save = async () => {
    setBusy(true);
    await updateExperimentMethod(experimentId, {
      allocation_mode: mode,
      bandit_algorithm: algo,
      max_exposure_per_variant: maxExp.trim() === "" ? null : Number(maxExp),
      kill_switch_active: kill,
    });
    await logAuditEvent({ action: "admin.tool.launched", target_table: "pricing_experiments", target_id: experimentId, metadata: { tool: "experiment.method.updated", mode, algo } }).catch(() => {});
    setBusy(false); setOpen(false); onSaved();
  };

  return (
    <div className="flex items-end gap-2 flex-wrap p-2 border rounded-md bg-muted/30">
      <div className="space-y-1">
        <Label className="text-[10px]">Allocation mode</Label>
        <select className="h-8 text-xs border rounded px-2 bg-background" value={mode} onChange={(e) => setMode(e.target.value as AllocationMode)}>
          <option value="fixed">fixed</option>
          <option value="bandit">bandit</option>
          <option value="sequential">sequential</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px]">Bandit algorithm</Label>
        <select className="h-8 text-xs border rounded px-2 bg-background" value={algo} onChange={(e) => setAlgo(e.target.value as "thompson" | "ucb1")} disabled={mode !== "bandit"}>
          <option value="thompson">thompson</option>
          <option value="ucb1">ucb1</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px]">Max exposure / variant</Label>
        <Input type="number" className="h-8 w-28" value={maxExp} onChange={(e) => setMaxExp(e.target.value)} placeholder="(none)" />
      </div>
      <div className="space-y-1 flex items-center gap-2 pl-2">
        <Switch checked={kill} onCheckedChange={setKill} />
        <Label className="text-[10px]">Kill switch</Label>
      </div>
      <Button size="sm" onClick={save} disabled={busy}>{busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}</Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
    </div>
  );
}

