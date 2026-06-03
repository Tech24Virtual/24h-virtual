import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhoneCall, CheckCircle2, Clock } from "lucide-react";
import {
  fetchMyReceptionistSummary,
  type ClientReceptionistSummary,
} from "@/lib/governance/voiceOverview";

/**
 * Phase 5 — Client-safe AI receptionist visibility.
 * Reads v_client_receptionist_summary (RLS-scoped via leads.user_id).
 * No internal config, prompts, or routing details surfaced.
 */
export function ReceptionistStatusCard() {
  const [row, setRow] = useState<ClientReceptionistSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyReceptionistSummary()
      .then((r) => setRow(r))
      .catch(() => setRow(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !row || row.flow_count === 0) return null;

  const isLive = row.live_count > 0;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <PhoneCall className="h-4 w-4 text-primary" /> AI Receptionist
          </CardTitle>
          <Badge variant={isLive ? "default" : "secondary"}>
            {isLive ? "Live" : "Setup In Progress"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
        <div className="rounded-md border p-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" /> Live Flows
          </div>
          <div className="mt-1 text-2xl font-semibold">{row.live_count}</div>
          <div className="text-xs text-muted-foreground">{row.flow_count} configured</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" /> Pending Setup
          </div>
          <div className="mt-1 text-2xl font-semibold">{row.pending_count}</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" /> Last Validated
          </div>
          <div className="mt-1 text-sm font-medium">
            {row.last_validated_at ? new Date(row.last_validated_at).toLocaleDateString() : "Pending"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
