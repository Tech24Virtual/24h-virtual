/**
 * Phase 37 — GTM & Capacity Planning Panel
 *
 * Translates v_forecast_assembled into directional capacity demand and
 * compares against admin-maintained supply. All numbers are approximate
 * and explicitly labeled as such. No HR or budgeting system is implied.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Info, Users, Target, TrendingUp, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  fetchCapacityAssumptions, updateCapacityAssumptions,
  fetchCapacitySupply, upsertCapacitySupply,
  fetchCapacityDemand, fetchCapacityGaps,
  fetchGtmTargets, upsertGtmTarget, deleteGtmTarget, fetchGtmVariance,
  CAPACITY_FUNCTIONS, CAPACITY_SCOPES,
  type CapacityAssumptions, type CapacitySupplyRow, type CapacityDemandRow,
  type CapacityGapRow, type GtmTargetRow, type GtmTargetVarianceRow,
  type CapacityFunction, type CapacityScope,
} from "@/lib/governance/capacityPlanning";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from "recharts";

const fmtUsd = (n: number | null | undefined) =>
  n == null ? "—" : `$${Math.round(Number(n)).toLocaleString()}`;
const fmtNum = (n: number | null | undefined, d = 1) =>
  n == null ? "—" : Number(n).toFixed(d);
const fmtPct = (n: number | null | undefined) =>
  n == null ? "—" : `${(Number(n) * 100).toFixed(1)}%`;

const FUNCTION_LABEL: Record<CapacityFunction, string> = {
  csm: "Customer Success",
  support: "Support",
  implementation: "Implementation",
  wl_ops: "WL Ops",
};

export function CapacityPlanningPanel() {
  const [loading, setLoading] = useState(true);
  const [assumptions, setAssumptions] = useState<CapacityAssumptions | null>(null);
  const [supply, setSupply] = useState<CapacitySupplyRow[]>([]);
  const [demand, setDemand] = useState<CapacityDemandRow[]>([]);
  const [gaps, setGaps] = useState<CapacityGapRow[]>([]);
  const [targets, setTargets] = useState<GtmTargetRow[]>([]);
  const [variance, setVariance] = useState<GtmTargetVarianceRow[]>([]);

  // assumption edit buffers
  const [aArpu, setAArpu] = useState("");
  const [aCsm, setACsm] = useState("");
  const [aTickets, setATickets] = useState("");
  const [aSupport, setASupport] = useState("");
  const [aImpl, setAImpl] = useState("");
  const [aWl, setAWl] = useState("");
  const [aProj, setAProj] = useState("");

  // supply form
  const [sFunction, setSFunction] = useState<CapacityFunction>("csm");
  const [sScope, setSScope] = useState<CapacityScope>("both");
  const [sCurrent, setSCurrent] = useState("");
  const [sPlanned, setSPlanned] = useState("");

  // target form
  const [tPeriod, setTPeriod] = useState("");
  const [tScope, setTScope] = useState<CapacityScope>("both");
  const [tNewBiz, setTNewBiz] = useState("");
  const [tNrr, setTNrr] = useState("");
  const [tRenewal, setTRenewal] = useState("");

  async function load() {
    setLoading(true);
    const [a, s, d, g, tg, v] = await Promise.all([
      fetchCapacityAssumptions(),
      fetchCapacitySupply(),
      fetchCapacityDemand(),
      fetchCapacityGaps(),
      fetchGtmTargets(),
      fetchGtmVariance(),
    ]);
    setAssumptions(a);
    setSupply(s);
    setDemand(d);
    setGaps(g);
    setTargets(tg);
    setVariance(v);
    if (a) {
      setAArpu(String(a.arpu_assumption));
      setACsm(String(a.csm_accounts_per_head));
      setATickets(String(a.tickets_per_account_per_month));
      setASupport(String(a.support_tickets_per_agent_per_month));
      setAImpl(String(a.implementation_projects_per_specialist));
      setAWl(String(a.wl_rollout_per_ops_head));
      setAProj(String(a.new_projects_per_new_account));
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function saveAssumptions() {
    const ok = await updateCapacityAssumptions({
      arpu_assumption: Number(aArpu),
      csm_accounts_per_head: Math.round(Number(aCsm)),
      tickets_per_account_per_month: Number(aTickets),
      support_tickets_per_agent_per_month: Math.round(Number(aSupport)),
      implementation_projects_per_specialist: Math.round(Number(aImpl)),
      wl_rollout_per_ops_head: Math.round(Number(aWl)),
      new_projects_per_new_account: Number(aProj),
    });
    toast[ok ? "success" : "error"](ok ? "Capacity assumptions saved" : "Failed to save assumptions");
    if (ok) load();
  }

  async function saveSupply() {
    if (!sCurrent) { toast.error("Current headcount required"); return; }
    const ok = await upsertCapacitySupply({
      scope: sScope,
      function: sFunction,
      current_headcount: Number(sCurrent),
      planned_headcount: sPlanned ? Number(sPlanned) : null,
    });
    toast[ok ? "success" : "error"](ok ? "Supply updated" : "Failed to update supply");
    if (ok) { setSCurrent(""); setSPlanned(""); load(); }
  }

  async function saveTarget() {
    if (!tPeriod) { toast.error("Period required (YYYY-MM-01)"); return; }
    const ok = await upsertGtmTarget({
      period: tPeriod,
      scope: tScope,
      target_new_business_mrr: tNewBiz ? Number(tNewBiz) : null,
      target_nrr: tNrr ? Number(tNrr) : null,
      target_renewal_rate: tRenewal ? Number(tRenewal) : null,
    });
    toast[ok ? "success" : "error"](ok ? "GTM target saved" : "Failed to save target");
    if (ok) { setTNewBiz(""); setTNrr(""); setTRenewal(""); load(); }
  }

  async function removeTarget(id: string) {
    const ok = await deleteGtmTarget(id);
    toast[ok ? "success" : "error"](ok ? "Target removed" : "Failed to remove");
    if (ok) load();
  }

  const demandChartData = useMemo(() => demand.map((r) => ({
    period: r.period_label,
    "CSM": Number(r.needed_csm_heads),
    "Support": Number(r.needed_support_heads),
    "Implementation": Number(r.needed_implementation_heads),
    "WL Ops": Number(r.needed_wl_ops_heads),
  })), [demand]);

  const supplyByFn = useMemo(() => {
    const m = new Map<CapacityFunction, number>();
    supply.forEach((s) => m.set(s.function, (m.get(s.function) ?? 0) + Number(s.current_headcount)));
    return m;
  }, [supply]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading capacity planning…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-4 flex items-start gap-2 text-sm">
          <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-muted-foreground">
            <strong className="text-foreground">Directional only.</strong>{" "}
            These projections translate the canonical revenue forecast into rough capacity needs using
            configurable ratios. Use them to spot under or over staffing trends, not to make hiring
            decisions on their own. Numbers are not a substitute for HR planning.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview"><TrendingUp className="h-4 w-4 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="gaps"><AlertTriangle className="h-4 w-4 mr-1" />Gaps</TabsTrigger>
          <TabsTrigger value="supply"><Users className="h-4 w-4 mr-1" />Supply</TabsTrigger>
          <TabsTrigger value="targets"><Target className="h-4 w-4 mr-1" />GTM Targets</TabsTrigger>
          <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
        </TabsList>

        {/* ─── Overview ─── */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Implied Headcount Demand by Month</CardTitle>
            </CardHeader>
            <CardContent>
              {demandChartData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No forecast data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={demandChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="CSM" stackId="a" fill="hsl(var(--primary))" />
                    <Bar dataKey="Support" stackId="a" fill="hsl(var(--accent))" />
                    <Bar dataKey="Implementation" stackId="a" fill="#10b981" />
                    <Bar dataKey="WL Ops" stackId="a" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Demand Detail</CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Active Accts</TableHead>
                    <TableHead className="text-right">New Accts</TableHead>
                    <TableHead className="text-right">CSM</TableHead>
                    <TableHead className="text-right">Support</TableHead>
                    <TableHead className="text-right">Implementation</TableHead>
                    <TableHead className="text-right">WL Ops</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demand.map((r) => (
                    <TableRow key={r.period}>
                      <TableCell className="font-medium">{r.period_label}</TableCell>
                      <TableCell className="text-right">{fmtNum(r.forecasted_active_accounts, 0)}</TableCell>
                      <TableCell className="text-right">{fmtNum(r.forecasted_new_accounts, 1)}</TableCell>
                      <TableCell className="text-right">{fmtNum(r.needed_csm_heads)}</TableCell>
                      <TableCell className="text-right">{fmtNum(r.needed_support_heads)}</TableCell>
                      <TableCell className="text-right">{fmtNum(r.needed_implementation_heads)}</TableCell>
                      <TableCell className="text-right">{fmtNum(r.needed_wl_ops_heads)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Gaps ─── */}
        <TabsContent value="gaps" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Capacity Gaps (Demand vs Current Supply)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto">
              {gaps.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No gap data. Add capacity supply rows to compare against forecast demand.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Function</TableHead>
                      <TableHead className="text-right">Demand</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">Gap</TableHead>
                      <TableHead className="text-right">Over/Under</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gaps.map((g, i) => {
                      const under = g.gap_now < 0;
                      return (
                        <TableRow key={`${g.period}-${g.function}-${i}`}>
                          <TableCell className="font-mono text-xs">{g.period}</TableCell>
                          <TableCell>{FUNCTION_LABEL[g.function]}</TableCell>
                          <TableCell className="text-right">{fmtNum(g.demand)}</TableCell>
                          <TableCell className="text-right">{fmtNum(g.current_supply)}</TableCell>
                          <TableCell className={`text-right font-medium ${under ? "text-destructive" : "text-emerald-600"}`}>
                            {g.gap_now > 0 ? "+" : ""}{fmtNum(g.gap_now)}
                          </TableCell>
                          <TableCell className="text-right">{fmtPct(g.over_under_pct)}</TableCell>
                          <TableCell>
                            {under ? (
                              <Badge variant="destructive">Under</Badge>
                            ) : (
                              <Badge variant="outline" className="border-emerald-500/40 text-emerald-700">OK</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Supply ─── */}
        <TabsContent value="supply" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Add / Update Headcount</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div>
                <Label>Function</Label>
                <Select value={sFunction} onValueChange={(v) => setSFunction(v as CapacityFunction)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAPACITY_FUNCTIONS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Scope</Label>
                <Select value={sScope} onValueChange={(v) => setSScope(v as CapacityScope)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAPACITY_SCOPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Current</Label>
                <Input type="number" step="0.5" value={sCurrent} onChange={(e) => setSCurrent(e.target.value)} />
              </div>
              <div>
                <Label>Planned (optional)</Label>
                <Input type="number" step="0.5" value={sPlanned} onChange={(e) => setSPlanned(e.target.value)} />
              </div>
              <Button onClick={saveSupply}>Save</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Current Supply</CardTitle>
            </CardHeader>
            <CardContent>
              {supply.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No supply rows yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Function</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">Planned</TableHead>
                      <TableHead>Effective</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supply.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{FUNCTION_LABEL[s.function]}</TableCell>
                        <TableCell>{s.scope}</TableCell>
                        <TableCell className="text-right">{fmtNum(s.current_headcount)}</TableCell>
                        <TableCell className="text-right">{fmtNum(s.planned_headcount)}</TableCell>
                        <TableCell className="font-mono text-xs">{s.effective_date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Targets ─── */}
        <TabsContent value="targets" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Add / Update GTM Target</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
              <div>
                <Label>Period (YYYY-MM-01)</Label>
                <Input placeholder="2026-06-01" value={tPeriod} onChange={(e) => setTPeriod(e.target.value)} />
              </div>
              <div>
                <Label>Scope</Label>
                <Select value={tScope} onValueChange={(v) => setTScope(v as CapacityScope)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAPACITY_SCOPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target New Biz MRR</Label>
                <Input type="number" value={tNewBiz} onChange={(e) => setTNewBiz(e.target.value)} />
              </div>
              <div>
                <Label>Target NRR (0-3)</Label>
                <Input type="number" step="0.01" value={tNrr} onChange={(e) => setTNrr(e.target.value)} />
              </div>
              <div>
                <Label>Target Renewal Rate (0-1)</Label>
                <Input type="number" step="0.01" value={tRenewal} onChange={(e) => setTRenewal(e.target.value)} />
              </div>
              <Button onClick={saveTarget}>Save</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Target vs Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              {variance.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No targets set.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead className="text-right">Target New Biz</TableHead>
                      <TableHead className="text-right">Forecast New Biz</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead className="text-right">Target NRR</TableHead>
                      <TableHead className="text-right">Renewal %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variance.map((v, i) => (
                      <TableRow key={`${v.period}-${v.scope}-${i}`}>
                        <TableCell className="font-mono text-xs">{v.period}</TableCell>
                        <TableCell>{v.scope}</TableCell>
                        <TableCell className="text-right">{fmtUsd(v.target_new_business_mrr)}</TableCell>
                        <TableCell className="text-right">{fmtUsd(v.forecast_new_business_mrr)}</TableCell>
                        <TableCell className={`text-right ${v.new_business_variance_pct != null && v.new_business_variance_pct < 0 ? "text-destructive" : "text-emerald-600"}`}>
                          {fmtPct(v.new_business_variance_pct)}
                        </TableCell>
                        <TableCell className="text-right">{fmtPct(v.target_nrr)}</TableCell>
                        <TableCell className="text-right">{fmtPct(v.target_renewal_rate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Saved Targets</CardTitle>
            </CardHeader>
            <CardContent>
              {targets.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No targets yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead className="text-right">New Biz MRR</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {targets.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs">{t.period}</TableCell>
                        <TableCell>{t.scope}</TableCell>
                        <TableCell className="text-right">{fmtUsd(t.target_new_business_mrr)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => removeTarget(t.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Assumptions ─── */}
        <TabsContent value="assumptions" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Capacity Assumptions (scope: both)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>ARPU Assumption ($/account/month)</Label>
                <Input type="number" value={aArpu} onChange={(e) => setAArpu(e.target.value)} />
              </div>
              <div>
                <Label>Accounts per CSM</Label>
                <Input type="number" value={aCsm} onChange={(e) => setACsm(e.target.value)} />
              </div>
              <div>
                <Label>Tickets per Account / Month</Label>
                <Input type="number" step="0.1" value={aTickets} onChange={(e) => setATickets(e.target.value)} />
              </div>
              <div>
                <Label>Tickets per Support Agent / Month</Label>
                <Input type="number" value={aSupport} onChange={(e) => setASupport(e.target.value)} />
              </div>
              <div>
                <Label>Implementation Projects per Specialist</Label>
                <Input type="number" value={aImpl} onChange={(e) => setAImpl(e.target.value)} />
              </div>
              <div>
                <Label>WL Rollouts per Ops Head / Month</Label>
                <Input type="number" value={aWl} onChange={(e) => setAWl(e.target.value)} />
              </div>
              <div>
                <Label>New Projects per New Account</Label>
                <Input type="number" step="0.1" value={aProj} onChange={(e) => setAProj(e.target.value)} />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button onClick={saveAssumptions}>Save Assumptions</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
