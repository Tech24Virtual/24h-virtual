/**
 * Phase 34 — Deal-level Approvals Timeline
 *
 * Renders a chronological vertical timeline of every approval request
 * raised against a single renewal/expansion deal: requested → decided,
 * with approver identity (full_name from profiles), policy name, the
 * SLA window, the triggering discount/term flags snapshotted at request
 * time, and the rejection/approval reason. SLA breaches are flagged.
 *
 * Data source: v_deal_approval_timeline (joins approval_requests with
 * approval_policies and profiles).
 */
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2, XCircle, MinusCircle, Clock } from "lucide-react";
import {
  fetchDealApprovalTimeline,
  type DealApprovalTimelineRow,
} from "@/lib/governance/approvals";

export default function DealApprovalsTimeline({ dealId }: { dealId: string }) {
  const [rows, setRows] = useState<DealApprovalTimelineRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setRows(await fetchDealApprovalTimeline(dealId));
    setLoading(false);
  }
  useEffect(() => { load(); }, [dealId]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">
          Approvals timeline ({rows.length})
        </div>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          {loading
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <RefreshCw className="h-3 w-3" />}
        </Button>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground flex items-center gap-2 py-3">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading timeline…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3">
          No approval requests have been raised for this deal yet.
        </p>
      ) : (
        <ol className="relative border-l border-border ml-2 space-y-3 pl-4">
          {rows.map((r) => (
            <TimelineEntry key={r.id} row={r} />
          ))}
        </ol>
      )}
    </div>
  );
}

function TimelineEntry({ row }: { row: DealApprovalTimelineRow }) {
  const Icon = statusIcon(row.status);
  const dotClass = statusDotClass(row.status, row.is_sla_breached);

  const triggers: string[] = [];
  if (row.estimated_discount_pct_snapshot != null) {
    triggers.push(`discount ${row.estimated_discount_pct_snapshot}%`);
  } else {
    triggers.push("discount unknown");
  }
  if (row.is_non_standard_term_snapshot) triggers.push("non-standard term");
  if (row.is_exception_snapshot) triggers.push("exception");

  return (
    <li className="relative">
      <span
        className={`absolute -left-[22px] top-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full ring-2 ring-background ${dotClass}`}
        aria-hidden="true"
      />
      <div className="rounded-md border p-3 text-xs space-y-2">
        {/* Header row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Icon className="h-3.5 w-3.5" />
          <Badge variant={statusVariant(row.status)} className="capitalize">
            {row.status}
          </Badge>
          <Badge variant="outline">Tier {row.tier}</Badge>
          <Badge variant="outline">role: {row.required_role}</Badge>
          {row.policy_name && (
            <Badge variant="secondary">policy: {row.policy_name}</Badge>
          )}
          {row.is_sla_breached && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> SLA breached
            </Badge>
          )}
        </div>

        {/* Time row */}
        <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
          <span>
            <Clock className="inline h-3 w-3 mr-1" />
            requested {new Date(row.requested_at).toLocaleString()}
          </span>
          {row.sla_hours_snapshot != null && (
            <span>SLA window {row.sla_hours_snapshot}h</span>
          )}
          {row.decided_at && (
            <span>
              decided {new Date(row.decided_at).toLocaleString()}
              {row.hours_to_decision != null && ` (${row.hours_to_decision.toFixed(1)}h)`}
            </span>
          )}
          {!row.decided_at && row.hours_pending != null && (
            <span>{row.hours_pending.toFixed(1)}h pending</span>
          )}
        </div>

        {/* Trigger snapshot */}
        <div>
          <span className="text-muted-foreground">Triggered by:</span>{" "}
          {triggers.join(" · ")}
          {row.proposed_plan_key_snapshot && (
            <>
              {" · "}plan {row.proposed_plan_key_snapshot}
              {row.proposed_term_months_snapshot
                ? ` (${row.proposed_term_months_snapshot}mo)`
                : ""}
            </>
          )}
        </div>

        {/* Policy reason */}
        {row.reason && (
          <div>
            <span className="text-muted-foreground">Policy reason:</span> {row.reason}
          </div>
        )}

        {/* Decision */}
        {(row.decided_at || row.decision_notes) && (
          <div className="rounded bg-muted/50 px-2 py-1.5 space-y-0.5">
            <div>
              <span className="text-muted-foreground">
                {row.status === "approved"
                  ? "Approval note:"
                  : row.status === "rejected"
                  ? "Rejection reason:"
                  : row.status === "cancelled"
                  ? "Cancellation reason:"
                  : "Decision note:"}
              </span>{" "}
              {row.decision_notes || (
                <span className="italic text-muted-foreground">none recorded</span>
              )}
            </div>
            <div className="text-muted-foreground">
              by{" "}
              {row.decided_by_name
                ? row.decided_by_name
                : row.decided_by
                ? `user ${row.decided_by.slice(0, 8)}…`
                : "—"}
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

function statusIcon(status: string) {
  switch (status) {
    case "approved": return CheckCircle2;
    case "rejected": return XCircle;
    case "cancelled": return MinusCircle;
    default: return Clock;
  }
}

function statusDotClass(status: string, breached: boolean): string {
  if (status === "approved") return "bg-primary";
  if (status === "rejected") return "bg-destructive";
  if (status === "cancelled") return "bg-muted-foreground";
  return breached ? "bg-destructive" : "bg-secondary-foreground/60";
}

function statusVariant(status: string): "default" | "destructive" | "outline" | "secondary" {
  if (status === "approved") return "default";
  if (status === "rejected") return "destructive";
  if (status === "cancelled") return "outline";
  return "secondary";
}
