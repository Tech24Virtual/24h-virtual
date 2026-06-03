/**
 * Phase 23 — Pricing Lab Panel (admin-only)
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, FlaskConical, Plus } from "lucide-react";
import {
  fetchPricingExperiments,
  fetchPricingExperimentResults,
  createPricingExperiment,
  setExperimentStatus,
  formatUsd,
  conversionRate,
  type PricingExperiment,
  type PricingExperimentResultRow,
} from "@/lib/governance/pricingExperiments";

export default function PricingLabPanel() {
  const [experiments, setExperiments] = useState<PricingExperiment[]>([]);
  const [results, setResults] = useState<PricingExperimentResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [variantsText, setVariantsText] = useState(
    JSON.stringify(
      [
        { key: "control", label: "Control — current pricing" },
        { key: "variant_a", label: "Variant A — +10%", price_usd: 0 },
      ],
      null,
      2,
    ),
  );

  const refresh = async () => {
    setLoading(true);
    const [e, r] = await Promise.all([fetchPricingExperiments(), fetchPricingExperimentResults()]);
    setExperiments(e);
    setResults(r);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const submit = async () => {
    let variants: any[] = [];
    try { variants = JSON.parse(variantsText); } catch { alert("Invalid variants JSON"); return; }
    if (!name.trim() || variants.length < 2) { alert("Name + at least 2 variants required"); return; }
    await createPricingExperiment({ name, hypothesis, variants });
    setName(""); setHypothesis(""); setShowForm(false);
    refresh();
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Pricing Lab.</strong> Variants are documented packaging tests, not a parallel billing system.
          Results compose canonical Phase 17 subscription truth via <code>v_pricing_experiment_results</code>:
          conversions and active MRR only count where Phase 17 says so. Variants with no assignments stay zero.
          Admin-only.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><FlaskConical className="h-4 w-4" />Pricing experiments</CardTitle>
            <CardDescription>{experiments.length} total · {experiments.filter((e) => e.status === "active").length} active</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}><Plus className="h-4 w-4 mr-1" />New experiment</Button>
        </CardHeader>
        {showForm && (
          <CardContent className="space-y-3 border-t pt-4">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Q2 pricing test — Receptionist Lite" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hypothesis</Label>
              <Textarea value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} rows={2} placeholder="Lifting price 10% will not reduce conversion below 90% of control." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Variants (JSON array)</Label>
              <Textarea value={variantsText} onChange={(e) => setVariantsText(e.target.value)} rows={6} className="font-mono text-xs" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={submit}>Create</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        )}
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        experiments.map((e) => {
          const rows = results.filter((r) => r.experiment_id === e.id);
          return (
            <Card key={e.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm">{e.name}</CardTitle>
                    <CardDescription className="text-xs">{e.hypothesis ?? "No hypothesis"}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={e.status === "active" ? "default" : "outline"} className="text-[10px] capitalize">{e.status}</Badge>
                    {e.status === "draft" && <Button size="sm" variant="outline" onClick={async () => { await setExperimentStatus(e.id, "active"); refresh(); }}>Activate</Button>}
                    {e.status === "active" && <Button size="sm" variant="outline" onClick={async () => { await setExperimentStatus(e.id, "closed"); refresh(); }}>Close</Button>}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variant</TableHead>
                      <TableHead className="text-right">Assignments</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Converted</TableHead>
                      <TableHead className="text-right">Conv %</TableHead>
                      <TableHead className="text-right">Active subs</TableHead>
                      <TableHead className="text-right">Active MRR</TableHead>
                      <TableHead className="text-right">Avg MRR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground text-xs">No assignments yet.</TableCell></TableRow>
                    )}
                    {rows.map((r) => {
                      const cr = conversionRate(r);
                      return (
                        <TableRow key={`${r.experiment_id}-${r.variant_key}`}>
                          <TableCell className="font-medium">{r.variant_key ?? "—"}</TableCell>
                          <TableCell className="text-right">{r.assignments}</TableCell>
                          <TableCell className="text-right">{r.leads_assigned}</TableCell>
                          <TableCell className="text-right">{r.leads_converted}</TableCell>
                          <TableCell className="text-right">{cr === null ? "—" : `${(cr * 100).toFixed(1)}%`}</TableCell>
                          <TableCell className="text-right">{r.active_subs}</TableCell>
                          <TableCell className="text-right">{formatUsd(r.active_known_mrr_usd)}</TableCell>
                          <TableCell className="text-right">{formatUsd(r.avg_active_known_mrr_usd)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
