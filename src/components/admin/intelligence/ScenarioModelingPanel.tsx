/**
 * Phase 21 — Scenario Modeling Panel (admin-only)
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, Sliders, TrendingUp } from "lucide-react";
import {
  fetchScenarioBundle,
  projectScenario,
  SCENARIO_PRESETS,
  formatUsd,
  formatPct,
  type ScenarioBundle,
  type ScenarioLevers,
  type ScenarioOutput,
} from "@/lib/governance/scenarioModeling";

export default function ScenarioModelingPanel() {
  const [bundle, setBundle] = useState<ScenarioBundle | null | undefined>(undefined);
  const [custom, setCustom] = useState<ScenarioLevers>(SCENARIO_PRESETS.base);

  useEffect(() => {
    let cancelled = false;
    fetchScenarioBundle()
      .then((b) => { if (!cancelled) setBundle(b); })
      .catch(() => { if (!cancelled) setBundle(null); });
    return () => { cancelled = true; };
  }, []);

  const customScenario: ScenarioOutput | null = useMemo(() => {
    if (!bundle) return null;
    return projectScenario(bundle.baseline, custom, "custom", "Custom");
  }, [bundle, custom]);

  if (bundle === undefined) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (bundle === null) {
    return <p className="text-sm text-destructive">Failed to load scenario bundle.</p>;
  }

  const b = bundle.baseline;
  const allScenarios = customScenario ? [...bundle.scenarios, customScenario] : bundle.scenarios;

  return (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Honesty notice.</strong> Baseline is sourced strictly from canonical Phase 17/18/19 views.
          Levers are explicit operator overrides. Outputs are operator guidance, not a forecast or accounting projection.
          Expansion / contraction levers are informational until a discrete movement event log exists. Admin-only.
        </AlertDescription>
      </Alert>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-2 text-muted-foreground"><TrendingUp className="h-4 w-4" />Starting MRR</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{formatUsd(b.startingMrrUsd)}</p><p className="text-xs text-muted-foreground">latest ending MRR</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Baseline new MRR / mo</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{formatUsd(b.avgNewMrrUsd)}</p><p className="text-xs text-muted-foreground">trailing 3-month avg</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Baseline monthly churn</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{formatPct(b.monthlyChurnRate)}</p><p className="text-xs text-muted-foreground">trailing 3-month avg</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Blended CAC / Avg MRR</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{formatUsd(b.blendedCacUsd)}</p><p className="text-xs text-muted-foreground">avg MRR {formatUsd(b.blendedAvgMrrUsd)}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Sliders className="h-4 w-4" />Custom scenario levers</CardTitle>
          <CardDescription>Adjust values to model a custom outcome. Presets remain unchanged.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <LeverInput label="New MRR growth ×" value={custom.newMrrGrowthMultiplier} onChange={(v) => setCustom({ ...custom, newMrrGrowthMultiplier: v })} step={0.05} />
          <LeverInput label="Churn rate ×" value={custom.churnRateMultiplier} onChange={(v) => setCustom({ ...custom, churnRateMultiplier: v })} step={0.05} />
          <LeverInput label="Pricing uplift (0.05 = +5%)" value={custom.pricingUpliftPct} onChange={(v) => setCustom({ ...custom, pricingUpliftPct: v })} step={0.01} />
          <LeverInput label="CAC efficiency ×" value={custom.cacEfficiencyMultiplier} onChange={(v) => setCustom({ ...custom, cacEfficiencyMultiplier: v })} step={0.05} />
          <LeverInput label="Monthly expansion MRR (USD)" value={custom.monthlyExpansionMrrUsd} onChange={(v) => setCustom({ ...custom, monthlyExpansionMrrUsd: v })} step={500} />
          <LeverInput label="Monthly contraction MRR (USD)" value={custom.monthlyContractionMrrUsd} onChange={(v) => setCustom({ ...custom, monthlyContractionMrrUsd: v })} step={500} />
          <div className="flex items-end">
            <Button variant="outline" size="sm" onClick={() => setCustom(SCENARIO_PRESETS.base)}>Reset to base</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">12-month scenario comparison</CardTitle>
          <CardDescription>Base / Upside / Downside presets and your custom scenario.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scenario</TableHead>
                <TableHead className="text-right">Ending MRR (12mo)</TableHead>
                <TableHead className="text-right">Net New MRR</TableHead>
                <TableHead className="text-right">Annual Churn</TableHead>
                <TableHead className="text-right">Projected CAC</TableHead>
                <TableHead className="text-right">Payback (mo)</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allScenarios.map((s) => (
                <TableRow key={s.key}>
                  <TableCell className="font-medium capitalize">{s.label}</TableCell>
                  <TableCell className="text-right">{formatUsd(s.endingMrr12mo)}</TableCell>
                  <TableCell className={`text-right ${s.netNewMrr12mo >= 0 ? "text-emerald-600" : "text-destructive"}`}>{formatUsd(s.netNewMrr12mo)}</TableCell>
                  <TableCell className="text-right">{formatPct(s.projectedAnnualChurnRate)}</TableCell>
                  <TableCell className="text-right">{formatUsd(s.projectedCacUsd)}</TableCell>
                  <TableCell className="text-right">{s.projectedPaybackMonths === null ? "—" : s.projectedPaybackMonths.toFixed(1)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.notes.length === 0 ? "—" : s.notes.map((n, i) => <Badge key={i} variant="outline" className="mr-1 mb-1 text-[10px]">{n}</Badge>)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {customScenario && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custom scenario: month-by-month</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Starting</TableHead>
                  <TableHead className="text-right">+ New</TableHead>
                  <TableHead className="text-right">+ Expansion</TableHead>
                  <TableHead className="text-right">− Contraction</TableHead>
                  <TableHead className="text-right">− Churn</TableHead>
                  <TableHead className="text-right">Ending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customScenario.months.map((m) => (
                  <TableRow key={m.monthIndex}>
                    <TableCell>M{m.monthIndex}</TableCell>
                    <TableCell className="text-right">{formatUsd(m.startingMrr)}</TableCell>
                    <TableCell className="text-right text-emerald-600">{formatUsd(m.newMrr)}</TableCell>
                    <TableCell className="text-right text-emerald-600">{formatUsd(m.expansionMrr)}</TableCell>
                    <TableCell className="text-right text-amber-600">{formatUsd(m.contractionMrr)}</TableCell>
                    <TableCell className="text-right text-destructive">{formatUsd(m.churnedMrr)}</TableCell>
                    <TableCell className="text-right font-medium">{formatUsd(m.endingMrr)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LeverInput({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step: number }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
