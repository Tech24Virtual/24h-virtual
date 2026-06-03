/**
 * Phase 30 — Direct Customer Success Ops Panel
 *
 * Admin pipeline for direct (non-WL) accounts. Modeled on Phase 29's
 * PartnerSuccessOpsPanel but per-account (lead_id), with state rules drawn
 * from health band, lifecycle signal, subscription truth, and ticket load.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Users, Sparkles, AlertTriangle, ListChecks } from "lucide-react";
import {
  fetchDirectSuccessSummary,
  fetchDirectSuccessOpportunities,
  fetchDirectPlays,
  createDirectPlay,
  updateDirectPlay,
  DIRECT_STATE_LABEL,
  DIRECT_STATE_ORDER,
  DIRECT_PLAY_LABEL,
  directStateBadgeVariant,
  type DirectSuccessSummaryRow,
  type DirectSuccessOpportunityRow,
  type DirectPlayRow,
  type DirectSuccessState,
  type DirectPlayType,
  type DirectPlayStatus,
} from "@/lib/governance/directSuccess";

export default function DirectSuccessOpsPanel() {
  const [summary, setSummary] = useState<DirectSuccessSummaryRow[] | null | undefined>(undefined);
  const [opps, setOpps] = useState<DirectSuccessOpportunityRow[]>([]);
  const [plays, setPlays] = useState<DirectPlayRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  async function reloadAll() {
    const [s, o, p] = await Promise.all([
      fetchDirectSuccessSummary(),
      fetchDirectSuccessOpportunities(),
      fetchDirectPlays(),
    ]);
    setSummary(s);
    setOpps(o);
    setPlays(p);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchDirectSuccessSummary(),
      fetchDirectSuccessOpportunities(),
      fetchDirectPlays(),
    ])
      .then(([s, o, p]) => {
        if (!cancelled) { setSummary(s); setOpps(o); setPlays(p); }
      })
      .catch(() => { if (!cancelled) setSummary(null); });
    return () => { cancelled = true; };
  }, []);

  const grouped = useMemo(() => {
    const g: Record<DirectSuccessState, DirectSuccessSummaryRow[]> = {
      at_risk: [], stabilize: [], nurture: [], expansion_ready: [],
    };
    (summary ?? []).forEach((r) => g[r.success_state]?.push(r));
    return g;
  }, [summary]);

  const topRisk = useMemo(
    () => (summary ?? []).filter((r) => r.success_state === "at_risk").slice(0, 5),
    [summary],
  );
  const topExpansion = useMemo(
    () => (summary ?? []).filter((r) => r.success_state === "expansion_ready").slice(0, 5),
    [summary],
  );

  if (summary === undefined) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (summary === null) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Failed to load direct success data.</AlertDescription>
      </Alert>
    );
  }

  async function flagOpportunity(o: DirectSuccessOpportunityRow) {
    await createDirectPlay({
      lead_id: o.lead_id,
      play_type: o.opportunity_type,
      notes: `Auto-flagged from opportunity: ${o.reason}`,
    });
    await reloadAll();
  }

  async function setPlayStatus(id: string, status: DirectPlayStatus) {
    await updateDirectPlay(id, { status });
    await reloadAll();
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Top Risk Accounts
            </CardTitle>
            <CardDescription>Direct accounts needing immediate attention.</CardDescription>
          </CardHeader>
          <CardContent>
            {topRisk.length === 0 ? (
              <p className="text-sm text-muted-foreground">No at-risk direct accounts.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {topRisk.map((r) => (
                  <li key={r.lead_id} className="flex justify-between border-b pb-1 last:border-0">
                    <button className="text-left hover:underline" onClick={() => setSelected(r.lead_id)}>
                      <span className="font-medium">{r.company || r.name || "—"}</span>
                      <span className="text-xs text-muted-foreground ml-2">{r.plan_name ?? "no plan"}</span>
                    </button>
                    <Badge variant="destructive">{r.health_band}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Expansion-Ready Accounts
            </CardTitle>
            <CardDescription>Healthy direct accounts with expansion signals.</CardDescription>
          </CardHeader>
          <CardContent>
            {topExpansion.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expansion-ready direct accounts yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {topExpansion.map((r) => (
                  <li key={r.lead_id} className="flex justify-between border-b pb-1 last:border-0">
                    <button className="text-left hover:underline" onClick={() => setSelected(r.lead_id)}>
                      <span className="font-medium">{r.company || r.name || "—"}</span>
                      <span className="text-xs text-muted-foreground ml-2">{r.plan_name ?? "no plan"}</span>
                    </button>
                    <Badge>{r.days_live}d live</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline"><Users className="h-4 w-4 mr-1" />Pipeline</TabsTrigger>
          <TabsTrigger value="opportunities"><Sparkles className="h-4 w-4 mr-1" />Opportunities</TabsTrigger>
          <TabsTrigger value="plays"><ListChecks className="h-4 w-4 mr-1" />Plays</TabsTrigger>
          <TabsTrigger value="account" disabled={!selected}>Account Detail</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Direct Account Pipeline</CardTitle>
              <CardDescription>Grouped by success state. Rules trace to health, lifecycle, subscription, and tickets.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {DIRECT_STATE_ORDER.map((state) => (
                <div key={state}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={directStateBadgeVariant(state)}>{DIRECT_STATE_LABEL[state]}</Badge>
                    <span className="text-xs text-muted-foreground">{grouped[state].length} accounts</span>
                  </div>
                  {grouped[state].length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">None</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Health</TableHead>
                          <TableHead>Lifecycle</TableHead>
                          <TableHead>Sub</TableHead>
                          <TableHead>Open Tickets</TableHead>
                          <TableHead>Days Live</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {grouped[state].map((r) => (
                          <TableRow
                            key={r.lead_id}
                            className="cursor-pointer"
                            onClick={() => setSelected(r.lead_id)}
                          >
                            <TableCell className="font-medium">{r.company || r.name || "—"}</TableCell>
                            <TableCell>{r.plan_name ?? "—"}</TableCell>
                            <TableCell>{r.health_band}</TableCell>
                            <TableCell>{r.lifecycle_signal}</TableCell>
                            <TableCell>{r.subscription_state ?? "—"}</TableCell>
                            <TableCell>{r.open_tickets_count}</TableCell>
                            <TableCell>{r.days_live}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Candidate Plays</CardTitle>
              <CardDescription>Rule-based suggestions with explicit reason codes. Flagging creates a play.</CardDescription>
            </CardHeader>
            <CardContent>
              {opps.length === 0 ? (
                <p className="text-sm text-muted-foreground">No opportunities surfaced.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {opps.map((o, i) => (
                      <TableRow key={`${o.lead_id}-${o.opportunity_type}-${i}`}>
                        <TableCell className="font-medium">{o.company || o.name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={directStateBadgeVariant(o.success_state)}>
                            {DIRECT_STATE_LABEL[o.success_state]}
                          </Badge>
                        </TableCell>
                        <TableCell>{DIRECT_PLAY_LABEL[o.opportunity_type]}</TableCell>
                        <TableCell>{o.priority}</TableCell>
                        <TableCell className="text-xs">{o.reason}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => flagOpportunity(o)}>
                            Flag play
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

        <TabsContent value="plays">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active Plays</CardTitle>
              <CardDescription>Lightweight tracking. Not a CRM.</CardDescription>
            </CardHeader>
            <CardContent>
              {plays.length === 0 ? (
                <p className="text-sm text-muted-foreground">No plays logged.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Follow up</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plays.map((p) => {
                      const acct = (summary ?? []).find((r) => r.lead_id === p.lead_id);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            {acct?.company || acct?.name || p.lead_id.slice(0, 8)}
                          </TableCell>
                          <TableCell>{DIRECT_PLAY_LABEL[p.play_type]}</TableCell>
                          <TableCell>
                            <select
                              className="border rounded px-2 py-1 text-xs bg-background"
                              value={p.status}
                              onChange={(e) => setPlayStatus(p.id, e.target.value as DirectPlayStatus)}
                            >
                              <option value="not_started">Not started</option>
                              <option value="active">Active</option>
                              <option value="completed">Completed</option>
                              <option value="dismissed">Dismissed</option>
                            </select>
                          </TableCell>
                          <TableCell>{p.follow_up_date ?? "—"}</TableCell>
                          <TableCell className="text-xs max-w-md truncate">{p.notes ?? "—"}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => setSelected(p.lead_id)}>
                              View
                            </Button>
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

        <TabsContent value="account">
          {selected && (() => {
            const acct = (summary ?? []).find((r) => r.lead_id === selected);
            if (!acct) return <p className="text-sm text-muted-foreground">Account not found.</p>;
            const reasons = acct.reasons ?? [];
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{acct.company || acct.name || "—"}</CardTitle>
                  <CardDescription>
                    {acct.plan_name ?? "No plan"} · {acct.subscription_state ?? "no sub"} · {acct.days_live}d live
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={directStateBadgeVariant(acct.success_state)}>
                      {DIRECT_STATE_LABEL[acct.success_state]}
                    </Badge>
                    <Badge variant="outline">Health: {acct.health_band}</Badge>
                    <Badge variant="outline">Lifecycle: {acct.lifecycle_signal}</Badge>
                    <Badge variant="outline">Receptionist: {acct.receptionist_health}</Badge>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground mb-1">Health reasons</p>
                    {reasons.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No risk reasons logged.</p>
                    ) : (
                      <ul className="text-sm list-disc pl-5">
                        {reasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground mb-1">Active flags</p>
                    <div className="flex flex-wrap gap-1 text-xs">
                      {acct.flag_payment_risk && <Badge variant="destructive">payment risk</Badge>}
                      {acct.flag_canceled && <Badge variant="destructive">canceled</Badge>}
                      {acct.flag_intervention && <Badge variant="destructive">intervention</Badge>}
                      {acct.flag_downgrade_risk && <Badge variant="outline">downgrade risk</Badge>}
                      {acct.flag_no_receptionist && <Badge variant="outline">no live receptionist</Badge>}
                      {acct.flag_support_friction && <Badge variant="outline">support friction</Badge>}
                      {acct.flag_inactive && <Badge variant="outline">inactive</Badge>}
                      {acct.flag_expansion_ready && <Badge>expansion ready</Badge>}
                      {acct.flag_new_account && <Badge variant="secondary">new account</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
