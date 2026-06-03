/**
 * Phase 34 — Commercial Approvals & Discount Governance
 *
 * Admin-only panel mounted at /admin/intelligence → Approvals tab.
 * Surfaces:
 *   - Pending approval queue (approve / reject with notes)
 *   - Approval policies (toggle active, add new)
 *   - Light governance editor on individual deals (discount %, flags, re-evaluate)
 */
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, ShieldCheck, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchOpenApprovalRequests,
  decideApprovalRequest,
  evaluateDealApprovals,
  updateDealGovernanceFields,
  APPROVAL_STATE_LABEL,
  type OpenApprovalRequest,
} from "@/lib/governance/approvals";
import { fetchOpenDeals, type RenewalExpansionDeal } from "@/lib/governance/renewalDeals";
import ApprovalPoliciesManager from "./ApprovalPoliciesManager";
import DealApprovalsTimeline from "./DealApprovalsTimeline";

export default function CommercialApprovalsPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<OpenApprovalRequest[]>([]);
  const [deals, setDeals] = useState<RenewalExpansionDeal[]>([]);
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    const [r, d] = await Promise.all([
      fetchOpenApprovalRequests(), fetchOpenDeals(),
    ]);
    setRequests(r); setDeals(d);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  async function decide(id: string, decision: "approved" | "rejected") {
    const notes = (decisionNotes[id] || "").trim();
    if (decision === "rejected" && notes.length < 3) {
      toast({
        title: "Rejection reason required",
        description: "Enter a short reason (min 3 characters) before rejecting.",
        variant: "destructive",
      });
      return;
    }
    const res = await decideApprovalRequest(id, decision, notes || undefined);
    toast({
      title: res.ok ? `Request ${decision}` : "Failed",
      description: res.ok ? undefined : res.error,
      variant: res.ok ? "default" : "destructive",
    });
    if (res.ok) reload();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Commercial Approvals & Discount Governance
          </CardTitle>
          <Button variant="outline" size="sm" onClick={reload}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Phase 34. Light deal-desk gate over renewal &amp; expansion deals. Configure thresholds,
          review pending approvals, and govern per-deal discount flags. Billing truth is unchanged;
          this layer only gates deal stage transitions and outbound communications.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="queue" className="space-y-4">
            <TabsList>
              <TabsTrigger value="queue">Queue ({requests.length})</TabsTrigger>
              <TabsTrigger value="deals">Deal Governance ({deals.length})</TabsTrigger>
              <TabsTrigger value="policies">Policies</TabsTrigger>
            </TabsList>

            {/* QUEUE */}
            <TabsContent value="queue" className="space-y-3">
              {requests.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No pending approvals. All deals are within policy or already decided.
                </p>
              ) : (
                requests.map((r) => (
                  <div key={r.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{r.scope}</Badge>
                          <Badge>{r.deal_type}</Badge>
                          <Badge variant="secondary">Tier {r.tier}</Badge>
                          <Badge variant="outline">{r.required_role}</Badge>
                          {r.policy_name && (
                            <span className="text-xs text-muted-foreground">
                              policy: {r.policy_name}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium">{r.reason || "Approval required"}</p>
                        <p className="text-xs text-muted-foreground">
                          Stage: {r.stage} · Discount:{" "}
                          {r.estimated_discount_pct != null ? `${r.estimated_discount_pct}%` : "unknown"}
                          {r.is_non_standard_term && " · non-standard term"}
                          {r.is_exception && " · exception"}
                        </p>
                        {r.proposed_plan_key && (
                          <p className="text-xs text-muted-foreground">
                            Proposed: {r.proposed_plan_key}
                            {r.proposed_term_months ? ` · ${r.proposed_term_months}mo` : ""}
                            {r.proposed_price_summary ? ` · ${r.proposed_price_summary}` : ""}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {r.hours_pending != null ? `${r.hours_pending.toFixed(1)}h pending` : ""}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Decision notes <span className="text-destructive">(required to reject)</span>
                      </Label>
                      <Textarea
                        placeholder="Reason for rejection or note for approval…"
                        value={decisionNotes[r.id] || ""}
                        onChange={(e) => setDecisionNotes((s) => ({ ...s, [r.id]: e.target.value }))}
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => decide(r.id, "rejected")}>
                        Reject
                      </Button>
                      <Button size="sm" onClick={() => decide(r.id, "approved")}>
                        Approve
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* DEAL GOVERNANCE */}
            <TabsContent value="deals" className="space-y-3">
              {deals.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No open deals.</p>
              ) : (
                deals.map((d) => <DealGovRow key={d.id} deal={d} onChanged={reload} />)
              )}
            </TabsContent>

            {/* POLICIES */}
            <TabsContent value="policies" className="space-y-3">
              <ApprovalPoliciesManager />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

function DealGovRow({ deal, onChanged }: { deal: RenewalExpansionDeal; onChanged: () => void }) {
  const { toast } = useToast();
  const [discount, setDiscount] = useState<string>(
    (deal as any).estimated_discount_pct != null ? String((deal as any).estimated_discount_pct) : "",
  );
  const [nonStd, setNonStd] = useState<boolean>(Boolean((deal as any).is_non_standard_term));
  const [exception, setException] = useState<boolean>(Boolean((deal as any).is_exception));
  const state: string = (deal as any).approval_state ?? "not_required";
  const [showTimeline, setShowTimeline] = useState(false);
  const [timelineKey, setTimelineKey] = useState(0);

  async function saveAndEvaluate() {
    const pct = discount === "" ? null : Number(discount);
    if (pct != null && (Number.isNaN(pct) || pct < 0 || pct > 100)) {
      toast({ title: "Discount must be 0–100", variant: "destructive" });
      return;
    }
    const ok = await updateDealGovernanceFields(deal.id, {
      estimated_discount_pct: pct,
      is_non_standard_term: nonStd,
      is_exception: exception,
    });
    if (!ok) { toast({ title: "Save failed", variant: "destructive" }); return; }
    const res = await evaluateDealApprovals(deal.id);
    toast({
      title: "Re-evaluated",
      description: res ? `state=${res.approval_state} · created=${res.created_requests}` : "no result",
    });
    if (showTimeline) setTimelineKey((k) => k + 1);
    onChanged();
  }

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">{deal.scope}</Badge>
          <Badge>{deal.deal_type}</Badge>
          <Badge variant="secondary">{deal.stage}</Badge>
          <Badge
            variant={state === "approved" ? "default" : state === "rejected" ? "destructive" : "outline"}
          >
            {APPROVAL_STATE_LABEL[(state as any) || "not_required"]}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {deal.proposed_plan_key || "—"}
          {deal.proposed_term_months ? ` · ${deal.proposed_term_months}mo` : ""}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs">Est. discount %</Label>
          <Input value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="e.g. 12.5" />
        </div>
        <div className="flex items-end gap-2">
          <Switch checked={nonStd} onCheckedChange={setNonStd} />
          <Label className="text-xs">Non-standard term</Label>
        </div>
        <div className="flex items-end gap-2">
          <Switch checked={exception} onCheckedChange={setException} />
          <Label className="text-xs">Exception</Label>
        </div>
        <div className="flex items-end justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowTimeline((v) => !v)}>
            {showTimeline ? "Hide timeline" : "Approvals timeline"}
          </Button>
          <Button size="sm" onClick={saveAndEvaluate}>Save &amp; evaluate</Button>
        </div>
      </div>

      {showTimeline && (
        <div className="mt-2 border-t pt-2">
          <DealApprovalsTimeline key={timelineKey} dealId={deal.id} />
        </div>
      )}
    </div>
  );
}

