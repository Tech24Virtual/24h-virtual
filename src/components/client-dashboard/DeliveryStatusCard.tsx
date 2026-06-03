import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, FileSearch, Megaphone, LifeBuoy } from "lucide-react";
import {
  fetchMyDeliveryStatus,
  type ClientDeliveryStatusRow,
} from "@/lib/governance/deliveryOverview";

/**
 * Phase 4 — Client-safe Delivery visibility.
 * Reads v_client_delivery_status (RLS-scoped to auth.uid via the view's WHERE).
 * No internal notes, assignment, or admin fields are surfaced.
 */
export function DeliveryStatusCard() {
  const [row, setRow] = useState<ClientDeliveryStatusRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyDeliveryStatus()
      .then((r) => setRow(r))
      .catch(() => setRow(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !row) return null;

  const stateMeta: Record<string, { label: string; tone: "default" | "secondary" | "destructive"; icon: typeof Clock }> = {
    not_started: { label: "Not started", tone: "secondary", icon: Clock },
    collecting_info: { label: "Collecting info", tone: "secondary", icon: FileSearch },
    in_review: { label: "In review", tone: "default", icon: FileSearch },
    live: { label: "Service live", tone: "default", icon: CheckCircle2 },
  };
  const meta = stateMeta[row.service_state] ?? { label: row.service_state, tone: "secondary" as const, icon: Clock };
  const Icon = meta.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-4 w-4 text-primary" /> Service Status
          </CardTitle>
          <Badge variant={meta.tone}>{meta.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
        <div className="rounded-md border p-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Megaphone className="h-4 w-4" /> Live campaigns
          </div>
          <div className="mt-1 text-2xl font-semibold">{row.live_campaigns_count}</div>
          <div className="text-xs text-muted-foreground">{row.total_campaigns_count} total</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <LifeBuoy className="h-4 w-4" /> Open support
          </div>
          <div className="mt-1 text-2xl font-semibold">{row.open_tickets_count}</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" /> Activated
          </div>
          <div className="mt-1 text-sm font-medium">
            {row.activated_at
              ? new Date(row.activated_at).toLocaleDateString()
              : "Pending"}
          </div>
          {row.intake_number && (
            <div className="text-xs text-muted-foreground">Ref {row.intake_number}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
