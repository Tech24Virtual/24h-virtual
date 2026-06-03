/**
 * Phase 12 — Client-facing nudges (read-only).
 * Composes Phase 4 delivery status, Phase 5 receptionist summary, Phase 12 trend.
 * Tenant-safe: all inputs already RLS-scoped to the calling user.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { fetchMyDeliveryStatus } from "@/lib/governance/deliveryOverview";
import { fetchMyReceptionistSummary } from "@/lib/governance/voiceOverview";
import {
  deriveClientNudges,
  fetchClientCallTrend,
  type ClientNudge,
} from "@/lib/governance/clientExperience";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  scope: "direct" | "wl";
  clientId: string; // auth.uid for direct, wl_client_id for wl
}

const ICONS = { action: AlertCircle, info: Info, ok: CheckCircle2 } as const;

export function ClientNudgesCard({ scope, clientId }: Props) {
  const [nudges, setNudges] = useState<ClientNudge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const trend = await fetchClientCallTrend({ scope, clientId });

        if (scope === "direct") {
          const [delivery, voice, scriptsRes] = await Promise.all([
            fetchMyDeliveryStatus().catch(() => null),
            fetchMyReceptionistSummary().catch(() => null),
            (supabase as any)
              .from("client_scripts")
              .select("id", { count: "exact", head: true })
              .eq("client_id", clientId)
              .eq("is_active", true),
          ]);
          const computed = deriveClientNudges({
            hasActiveScript: (scriptsRes?.count ?? 0) > 0,
            receptionistLive: (voice?.live_count ?? 0) > 0,
            receptionistPending: (voice?.flow_count ?? 0) > 0 && (voice?.live_count ?? 0) === 0,
            serviceState: delivery?.service_state ?? null,
            openTickets: delivery?.open_tickets_count ?? 0,
            trend,
          });
          if (mounted) setNudges(computed);
        } else {
          // WL end-client: pull service status + scripts via RLS-scoped tables
          const [statusRes, scriptsRes] = await Promise.all([
            (supabase as any)
              .from("v_wl_client_service_status")
              .select("*")
              .eq("wl_client_id", clientId)
              .maybeSingle(),
            (supabase as any)
              .from("wl_client_scripts")
              .select("id", { count: "exact", head: true })
              .eq("wl_client_id", clientId)
              .eq("is_active", true),
          ]);
          const status = statusRes?.data;
          const computed = deriveClientNudges({
            hasActiveScript: (scriptsRes?.count ?? 0) > 0,
            receptionistLive: (status?.live_receptionist_flows ?? 0) > 0,
            receptionistPending:
              (status?.pending_receptionist_flows ?? 0) > 0 &&
              (status?.live_receptionist_flows ?? 0) === 0,
            serviceState: status?.account_status === "active" ? "live" : "in_review",
            openTickets: status?.open_tickets ?? 0,
            trend,
          });
          if (mounted) setNudges(computed);
        }
      } catch {
        if (mounted) setNudges([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [scope, clientId]);

  const actionCount = nudges.filter((n) => n.tone === "action").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">What's Next</CardTitle>
          {!loading && actionCount > 0 && (
            <Badge variant="secondary">{actionCount} action items</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ul className="space-y-3">
            {nudges.map((n) => {
              const Icon = ICONS[n.tone];
              const tint =
                n.tone === "action" ? "text-cta" : n.tone === "ok" ? "text-green-600" : "text-primary";
              return (
                <li key={n.id} className="flex items-start gap-3 text-sm">
                  <Icon className={`h-4 w-4 mt-0.5 ${tint}`} />
                  <div className="flex-1">
                    <div className="font-medium">{n.title}</div>
                    <div className="text-xs text-muted-foreground">{n.detail}</div>
                  </div>
                  {n.drillRoute && scope === "direct" && (
                    <Button size="sm" variant="ghost" asChild>
                      <Link to={n.drillRoute}>
                        Open <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
