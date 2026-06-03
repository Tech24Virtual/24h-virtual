/**
 * Phase 29 — Partner Success & Expansion Operations
 *
 * Admin pipeline view: partner list segmented by success state, top expansion
 * candidates, top risk partners, drill-down to underlying accounts, and a
 * lightweight play log. Admin scope only via underlying RLS.
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
  fetchPartnerSuccessSummary,
  fetchPartnerSuccessOpportunities,
  fetchPartnerSuccessAccounts,
  fetchPartnerPlays,
  createPartnerPlay,
  updatePartnerPlay,
  STATE_LABEL,
  stateBadgeVariant,
  PLAY_LABEL,
  type PartnerSuccessSummaryRow,
  type PartnerSuccessOpportunityRow,
  type PartnerSuccessAccountRow,
  type PartnerPlayRow,
  type PartnerState,
  type PlayType,
  type PlayStatus,
} from "@/lib/governance/partnerSuccess";
import { formatUsd } from "@/lib/governance/wlEconomics";

const STATE_ORDER: PartnerState[] = ["at_risk", "stabilize", "nurture", "strategic_growth"];

function pct(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${(v * 100).toFixed(0)}%`;
}

export default function PartnerSuccessOpsPanel() {
  const [summary, setSummary] = useState<PartnerSuccessSummaryRow[] | null | undefined>(undefined);
  const [opps, setOpps] = useState<PartnerSuccessOpportunityRow[]>([]);
  const [plays, setPlays] = useState<PartnerPlayRow[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<PartnerSuccessAccountRow[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);

  async function reloadAll() {
    const [s, o, p] = await Promise.all([
      fetchPartnerSuccessSummary(),
      fetchPartnerSuccessOpportunities(),
      fetchPartnerPlays(),
    ]);
    setSummary(s);
    setOpps(o);
    setPlays(p);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchPartnerSuccessSummary(),
      fetchPartnerSuccessOpportunities(),
      fetchPartnerPlays(),
    ])
      .then(([s, o, p]) => {
        if (!cancelled) { setSummary(s); setOpps(o); setPlays(p); }
      })
      .catch(() => { if (!cancelled) setSummary(null); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedPartner) return;
    setAccountsLoading(true);
    fetchPartnerSuccessAccounts(selectedPartner)
      .then(setAccounts)
      .finally(() => setAccountsLoading(false));
  }, [selectedPartner]);

  const grouped = useMemo(() => {
    const map: Record<PartnerState, PartnerSuccessSummaryRow[]> = {
      at_risk: [], stabilize: [], nurture: [], strategic_growth: [],
    };
    (summary ?? []).forEach((r) => map[r.partner_state]?.push(r));
    return map;
  }, [summary]);

  const topRisk = useMemo(
    () => (summary ?? [])
      .filter((s) => s.partner_state === "at_risk" || s.flag_high_intervention)
      .sort((a, b) => (b.intervention_share ?? 0) - (a.intervention_share ?? 0))
      .slice(0, 5),
    [summary],
  );
  const topExpansion = useMemo(
    () => (summary ?? [])
      .filter((s) => s.flag_expansion_ready || s.flag_strategic)
      .sort((a, b) => (b.healthy_share ?? 0) - (a.healthy_share ?? 0))
      .slice(0, 5),
    [summary],
  );

  if (summary === undefined) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (summary === null) {
    return <p className="text-sm text-destructive">Failed to load partner success data.</p>;
  }

  const partnerLookup = (id: string) => summary.find((s) => s.partner_id === id);

  return (
    <div className="space-y-6">
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Partner state is rule-based: <strong>at_risk</strong> (intervention share ≥ 30% or contraction signal),
          <strong> stabilize</strong> (low margin or net contraction), <strong>strategic_growth</strong> (≥70% healthy + expansion + 5+ active),
          otherwise <strong>nurture</strong>. Reasons are explicit; no opaque scoring.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Top risk partners
            </CardTitle>
            <CardDescription>By intervention share, then state.</CardDescription>
          </CardHeader>
          <CardContent>
            {topRisk.length === 0 ? (
              <p className="text-sm text-muted-foreground">No at-risk partners.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {topRisk.map((p) => (
                  <li key={p.partner_id} className="flex items-center justify-between">
                    <button
                      className="text-left hover:underline"
                      onClick={() => setSelectedPartner(p.partner_id)}
                    >
                      {p.company_name}
                    </button>
                    <Badge variant={stateBadgeVariant(p.partner_state)} className="text-[10px]">
                      {pct(p.intervention_share)} intervention
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Top expansion candidates
            </CardTitle>
            <CardDescription>Healthy portfolio with expansion signals.</CardDescription>
          </CardHeader>
          <CardContent>
            {topExpansion.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expansion-ready partners yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {topExpansion.map((p) => (
                  <li key={p.partner_id} className="flex items-center justify-between">
                    <button
                      className="text-left hover:underline"
                      onClick={() => setSelectedPartner(p.partner_id)}
                    >
                      {p.company_name}
                    </button>
                    <Badge variant="default" className="text-[10px]">
                      {pct(p.healthy_share)} healthy · {p.clients_expansion} expanding
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pipeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="opportunities">
            Opportunities <span className="ml-1 text-[10px] text-muted-foreground">({opps.length})</span>
          </TabsTrigger>
          <TabsTrigger value="plays">
            Plays <span className="ml-1 text-[10px] text-muted-foreground">({plays.length})</span>
          </TabsTrigger>
          {selectedPartner && <TabsTrigger value="drilldown">Drill-down</TabsTrigger>}
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4">
          {STATE_ORDER.map((state) => (
            <Card key={state}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Badge variant={stateBadgeVariant(state)}>{STATE_LABEL[state]}</Badge>
                  <span className="text-muted-foreground text-xs">({grouped[state].length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {grouped[state].length === 0 ? (
                  <p className="text-xs text-muted-foreground">No partners.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Partner</TableHead>
                        <TableHead className="text-right">Active</TableHead>
                        <TableHead className="text-right">Healthy %</TableHead>
                        <TableHead className="text-right">Intervention %</TableHead>
                        <TableHead className="text-right">Recurring (90d)</TableHead>
                        <TableHead className="text-right">Margin %</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grouped[state].map((p) => (
                        <TableRow key={p.partner_id}>
                          <TableCell className="font-medium">
                            {p.company_name}
                            <div className="text-[11px] text-muted-foreground">{p.tier ?? "—"} · {p.partner_status ?? "—"}</div>
                          </TableCell>
                          <TableCell className="text-right">{p.active_clients}/{p.total_clients}</TableCell>
                          <TableCell className="text-right">{pct(p.healthy_share)}</TableCell>
                          <TableCell className="text-right">{pct(p.intervention_share)}</TableCell>
                          <TableCell className="text-right">{formatUsd(p.recurring_value_proxy_usd)}</TableCell>
                          <TableCell className="text-right">{pct(p.partial_margin_pct)}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => setSelectedPartner(p.partner_id)}>
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="opportunities">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ListChecks className="h-4 w-4" /> Candidate plays
              </CardTitle>
              <CardDescription>Each row carries an explicit reason. Flag as a play to track follow-up.</CardDescription>
            </CardHeader>
            <CardContent>
              {opps.length === 0 ? (
                <p className="text-sm text-muted-foreground">No candidate plays.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partner</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {opps.map((o, i) => (
                      <TableRow key={`${o.partner_id}-${i}`}>
                        <TableCell className="font-medium">{o.company_name}</TableCell>
                        <TableCell>
                          <Badge variant={stateBadgeVariant(o.partner_state)} className="text-[10px]">
                            {STATE_LABEL[o.partner_state]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{PLAY_LABEL[o.opportunity_type]}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{o.reason}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await createPartnerPlay({
                                partner_id: o.partner_id,
                                play_type: o.opportunity_type,
                                notes: o.reason,
                              });
                              await reloadAll();
                            }}
                          >
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
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Play log</CardTitle>
              <CardDescription>Lightweight tracking; not a full CRM.</CardDescription>
            </CardHeader>
            <CardContent>
              {plays.length === 0 ? (
                <p className="text-sm text-muted-foreground">No plays yet. Flag from the Opportunities tab.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partner</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Follow-up</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plays.map((p) => {
                      const partner = partnerLookup(p.partner_id);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{partner?.company_name ?? p.partner_id.slice(0, 8)}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{PLAY_LABEL[p.play_type]}</Badge></TableCell>
                          <TableCell>
                            <select
                              className="text-xs border rounded px-2 py-1 bg-background"
                              value={p.status}
                              onChange={async (e) => {
                                await updatePartnerPlay(p.id, { status: e.target.value as PlayStatus });
                                await reloadAll();
                              }}
                            >
                              {(["not_started","active","completed","dismissed"] as PlayStatus[]).map((s) => (
                                <option key={s} value={s}>{s.replace("_", " ")}</option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell className="text-xs">{p.follow_up_date ?? "—"}</TableCell>
                          <TableCell className="text-xs max-w-[280px] truncate">{p.notes ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => setSelectedPartner(p.partner_id)}>
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

        {selectedPartner && (
          <TabsContent value="drilldown">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" /> {partnerLookup(selectedPartner)?.company_name ?? "Partner"} accounts
                </CardTitle>
                <CardDescription>Underlying client drivers behind this partner's state.</CardDescription>
              </CardHeader>
              <CardContent>
                {accountsLoading ? (
                  <div className="flex justify-center py-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>
                ) : accounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No live accounts found.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Health</TableHead>
                        <TableHead>Lifecycle</TableHead>
                        <TableHead>Receptionist</TableHead>
                        <TableHead className="text-right">Days live</TableHead>
                        <TableHead className="text-right">Days since activity</TableHead>
                        <TableHead className="text-right">Open tickets</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map((a) => (
                        <TableRow key={a.lead_id}>
                          <TableCell className="font-medium">
                            {a.company || a.name || a.lead_id.slice(0, 8)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={a.health_band === "intervention" ? "destructive"
                                : a.health_band === "watch" ? "secondary" : "default"}
                              className="text-[10px] capitalize"
                            >
                              {a.health_band}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{a.lifecycle_signal}</TableCell>
                          <TableCell className="text-xs">{a.receptionist_health}</TableCell>
                          <TableCell className="text-right">{a.days_live}</TableCell>
                          <TableCell className="text-right">{a.days_since_activity}</TableCell>
                          <TableCell className="text-right">{a.open_tickets_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
