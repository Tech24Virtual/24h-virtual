/**
 * Phase 6 — WL end-client service status card.
 * Mounted on the WL portal dashboard. Reads RLS-scoped v_wl_client_service_status.
 * Tenant-safe by design: returns no admin internals, no other tenants.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, FileText, LifeBuoy, Sparkles } from "lucide-react";
import {
  fetchWLClientServiceStatus,
  type WLClientServiceStatusRow,
} from "@/lib/governance/wlOverview";

interface Props {
  wlClientId: string;
}

export function WLClientServiceStatusCard({ wlClientId }: Props) {
  const [row, setRow] = useState<WLClientServiceStatusRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchWLClientServiceStatus(wlClientId)
      .then((r) => mounted && setRow(r))
      .catch(() => mounted && setRow(null))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [wlClientId]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Service Status</CardTitle>
          {row && (
            <Badge variant={row.any_receptionist_enabled ? "default" : "secondary"}>
              {row.any_receptionist_enabled ? "Receptionist Live" : "Receptionist Pending"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !row ? (
          <p className="text-sm text-muted-foreground">No service data yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>{row.live_receptionist_flows} live · {row.pending_receptionist_flows} pending</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span>{row.published_campaigns}/{row.total_campaigns} scripts published</span>
            </div>
            <div className="flex items-center gap-2">
              <LifeBuoy className="h-4 w-4 text-primary" />
              <span>{row.open_tickets} open tickets</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <span>
                {row.last_call_at
                  ? `Last call ${new Date(row.last_call_at).toLocaleDateString()}`
                  : "No calls yet"}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
