/**
 * Phase 33 — Renewal & Expansion Deal Operations
 * Admin Deals tab: pipeline by stage, open deals, stalled approvals, detail.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  fetchOpenDeals, fetchAllDeals, fetchStalledApprovedDeals,
  createDeal, transitionDealStage, reconcileDeals,
  DEAL_STAGE_LABEL, DEAL_STAGE_ORDER, DEAL_TYPE_LABEL,
  type RenewalExpansionDeal, type DealScope, type DealType, type DealStage,
} from "@/lib/governance/renewalDeals";
import { Loader2, RefreshCcw, Plus, AlertTriangle, Handshake } from "lucide-react";

const SCOPES: DealScope[] = ["direct", "partner"];
const TYPES: DealType[] = ["renewal", "expansion", "downsell", "save"];

export default function RenewalDealsOpsPanel() {
  const { toast } = useToast();
  const [open, setOpen] = useState<RenewalExpansionDeal[] | null>(null);
  const [all, setAll] = useState<RenewalExpansionDeal[] | null>(null);
  const [stalled, setStalled] = useState<RenewalExpansionDeal[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<RenewalExpansionDeal | null>(null);

  // create form
  const [form, setForm] = useState<{
    scope: DealScope; target_id: string; deal_type: DealType;
    proposed_plan_key: string; proposed_term_months: string;
    proposed_price_summary: string; expected_close_date: string; notes: string;
  }>({
    scope: "direct", target_id: "", deal_type: "renewal",
    proposed_plan_key: "", proposed_term_months: "",
    proposed_price_summary: "", expected_close_date: "", notes: "",
  });

  async function load() {
    const [o, a, s] = await Promise.all([
      fetchOpenDeals(), fetchAllDeals(), fetchStalledApprovedDeals(),
    ]);
    setOpen(o); setAll(a); setStalled(s);
  }
  useEffect(() => { load(); }, []);

  const pipelineByStage = useMemo(() => {
    const m = new Map<DealStage, RenewalExpansionDeal[]>();
    DEAL_STAGE_ORDER.forEach(s => m.set(s, []));
    (open ?? []).forEach(d => m.get(d.stage)?.push(d));
    return m;
  }, [open]);

  async function handleReconcile() {
    setBusy(true);
    const r = await reconcileDeals();
    setBusy(false);
    if (r) toast({ title: "Reconciled", description: `Implemented: ${r.implemented} · Stalled: ${r.stalled}` });
    else toast({ title: "Reconcile failed", variant: "destructive" });
    await load();
  }

  async function handleCreate() {
    if (!form.target_id) { toast({ title: "target_id required", variant: "destructive" }); return; }
    setBusy(true);
    const id = await createDeal({
      scope: form.scope, target_id: form.target_id, deal_type: form.deal_type,
      proposed_plan_key: form.proposed_plan_key || null,
      proposed_term_months: form.proposed_term_months ? Number(form.proposed_term_months) : null,
      proposed_price_summary: form.proposed_price_summary || null,
      expected_close_date: form.expected_close_date || null,
      notes: form.notes || null,
    });
    setBusy(false);
    if (id) {
      toast({ title: "Deal created" });
      setForm({ ...form, target_id: "", proposed_plan_key: "", proposed_term_months: "", proposed_price_summary: "", expected_close_date: "", notes: "" });
      await load();
    } else { toast({ title: "Create failed", variant: "destructive" }); }
  }

  async function handleStage(d: RenewalExpansionDeal, stage: DealStage) {
    const ok = await transitionDealStage(d.id, stage);
    if (ok) { toast({ title: `→ ${DEAL_STAGE_LABEL[stage]}` }); await load(); }
    else toast({ title: "Transition failed", variant: "destructive" });
  }

  if (open === null) return <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Handshake className="h-5 w-5" /> Renewal & Expansion Deals</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Phase 33. Thin internal commercial pipeline. Subscription truth remains authoritative; deals reconcile to it.</p>
        </div>
        <Button onClick={handleReconcile} disabled={busy} variant="outline" size="sm">
          <RefreshCcw className="h-4 w-4 mr-2" /> Reconcile to subscription truth
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pipeline">
          <TabsList>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
            <TabsTrigger value="stalled">Stalled ({stalled?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="new">New deal</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {DEAL_STAGE_ORDER.filter(s => !["closed_won","closed_lost","deferred"].includes(s)).map(stage => {
                const items = pipelineByStage.get(stage) ?? [];
                return (
                  <Card key={stage} className="bg-muted/30">
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-xs font-medium flex justify-between">
                        <span>{DEAL_STAGE_LABEL[stage]}</span>
                        <span className="text-muted-foreground">{items.length}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 space-y-2 max-h-72 overflow-auto">
                      {items.map(d => (
                        <button key={d.id} onClick={() => setSelected(d)}
                          className="w-full text-left text-xs bg-background border rounded p-2 hover:border-primary">
                          <div className="font-medium">{DEAL_TYPE_LABEL[d.deal_type]} · {d.scope}</div>
                          <div className="text-muted-foreground truncate">{d.target_id.slice(0,8)}…</div>
                          {d.proposed_plan_key && <div className="text-muted-foreground">→ {d.proposed_plan_key}</div>}
                        </button>
                      ))}
                      {items.length === 0 && <div className="text-xs text-muted-foreground italic">empty</div>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {selected && <DealDetail deal={selected} onClose={() => setSelected(null)} onStage={handleStage} />}
          </TabsContent>

          <TabsContent value="open" className="mt-4">
            <DealsTable deals={open} onSelect={setSelected} onStage={handleStage} />
            {selected && <div className="mt-4"><DealDetail deal={selected} onClose={() => setSelected(null)} onStage={handleStage} /></div>}
          </TabsContent>

          <TabsContent value="stalled" className="mt-4">
            <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Verbally approved deals with no implementation reflected in subscription truth after 14 days.
            </div>
            <DealsTable deals={stalled ?? []} onSelect={setSelected} onStage={handleStage} />
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            <DealsTable deals={all ?? []} onSelect={setSelected} onStage={handleStage} />
          </TabsContent>

          <TabsContent value="new" className="mt-4 space-y-3 max-w-xl">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Scope</Label>
                <Select value={form.scope} onValueChange={v => setForm({ ...form, scope: v as DealScope })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SCOPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.deal_type} onValueChange={v => setForm({ ...form, deal_type: v as DealType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{DEAL_TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Target ID ({form.scope === "direct" ? "lead_id" : "partner_id"})</Label>
              <Input value={form.target_id} onChange={e => setForm({ ...form, target_id: e.target.value })} placeholder="uuid" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Proposed plan key</Label>
                <Input value={form.proposed_plan_key} onChange={e => setForm({ ...form, proposed_plan_key: e.target.value })} />
              </div>
              <div>
                <Label>Term (months)</Label>
                <Input type="number" value={form.proposed_term_months} onChange={e => setForm({ ...form, proposed_term_months: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Proposed price summary (descriptive)</Label>
              <Input value={form.proposed_price_summary} onChange={e => setForm({ ...form, proposed_price_summary: e.target.value })} placeholder="e.g. $499/mo, 12mo, 10% off year 1" />
            </div>
            <div>
              <Label>Expected close date</Label>
              <Input type="date" value={form.expected_close_date} onChange={e => setForm({ ...form, expected_close_date: e.target.value })} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <Button onClick={handleCreate} disabled={busy}>
              <Plus className="h-4 w-4 mr-2" /> Create deal
            </Button>
            <p className="text-xs text-muted-foreground">Descriptive only — billing truth (Stripe/custom plans) remains authoritative.</p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function DealsTable({ deals, onSelect, onStage }: {
  deals: RenewalExpansionDeal[];
  onSelect: (d: RenewalExpansionDeal) => void;
  onStage: (d: RenewalExpansionDeal, s: DealStage) => void;
}) {
  if (!deals.length) return <div className="text-sm text-muted-foreground py-6 text-center">No deals.</div>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Scope</TableHead><TableHead>Type</TableHead><TableHead>Target</TableHead>
          <TableHead>Proposed</TableHead><TableHead>Stage</TableHead><TableHead>Status</TableHead>
          <TableHead>Days in stage</TableHead><TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {deals.map(d => (
          <TableRow key={d.id} className="cursor-pointer" onClick={() => onSelect(d)}>
            <TableCell><Badge variant="outline">{d.scope}</Badge></TableCell>
            <TableCell>{DEAL_TYPE_LABEL[d.deal_type]}</TableCell>
            <TableCell className="font-mono text-xs">{d.target_id.slice(0,8)}…</TableCell>
            <TableCell className="text-xs">{d.proposed_plan_key ?? "—"}{d.proposed_term_months ? ` · ${d.proposed_term_months}mo` : ""}</TableCell>
            <TableCell><Badge>{DEAL_STAGE_LABEL[d.stage]}</Badge></TableCell>
            <TableCell><Badge variant={d.status === "stalled" ? "destructive" : "secondary"}>{d.status}</Badge></TableCell>
            <TableCell>{d.days_in_stage != null ? Math.round(d.days_in_stage) : "—"}</TableCell>
            <TableCell onClick={e => e.stopPropagation()}>
              <Select onValueChange={(v) => onStage(d, v as DealStage)}>
                <SelectTrigger className="h-7 w-36 text-xs"><SelectValue placeholder="Move to…" /></SelectTrigger>
                <SelectContent>
                  {DEAL_STAGE_ORDER.map(s => <SelectItem key={s} value={s}>{DEAL_STAGE_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DealDetail({ deal, onClose, onStage }: {
  deal: RenewalExpansionDeal; onClose: () => void;
  onStage: (d: RenewalExpansionDeal, s: DealStage) => void;
}) {
  return (
    <Card className="border-primary/40">
      <CardHeader className="flex-row items-center justify-between py-3">
        <CardTitle className="text-sm">Deal detail · {deal.scope} · {DEAL_TYPE_LABEL[deal.deal_type]}</CardTitle>
        <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Field label="Stage" value={DEAL_STAGE_LABEL[deal.stage]} />
          <Field label="Status" value={deal.status} />
          <Field label="Target" value={deal.target_id} mono />
          <Field label="Owner" value={deal.owner_user_id ?? "—"} mono />
          <Field label="Current plan" value={deal.current_plan_key ?? "—"} />
          <Field label="Proposed plan" value={deal.proposed_plan_key ?? "—"} />
          <Field label="Term" value={deal.proposed_term_months ? `${deal.proposed_term_months} mo` : "—"} />
          <Field label="Expected close" value={deal.expected_close_date ?? "—"} />
          <Field label="Renewal date" value={deal.renewal_date ?? "—"} />
          <Field label="Comm actions" value={String(deal.comm_action_count ?? 0)} />
          <Field label="Implemented at" value={deal.implemented_at ?? "—"} />
          <Field label="Outcome" value={deal.outcome_reason ?? "—"} />
        </div>
        {deal.proposed_price_summary && <Field label="Price summary" value={deal.proposed_price_summary} />}
        {deal.notes && <Field label="Notes" value={deal.notes} />}
        <div className="flex flex-wrap gap-2 pt-2">
          {DEAL_STAGE_ORDER.map(s => (
            <Button key={s} size="sm" variant={s === deal.stage ? "default" : "outline"}
              onClick={() => onStage(deal, s)}>{DEAL_STAGE_LABEL[s]}</Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-muted-foreground text-[10px] uppercase">{label}</div>
      <div className={mono ? "font-mono text-xs" : ""}>{value}</div>
    </div>
  );
}
