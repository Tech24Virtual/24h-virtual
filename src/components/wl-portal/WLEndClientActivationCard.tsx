/**
 * Phase 15 — WL End-Client Activation Card.
 * Portal-safe activation milestones for an end-client. Reads only the
 * RLS-scoped v_wl_client_service_status row for this client.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { fetchWLClientServiceStatus } from "@/lib/governance/wlOverview";
import { trackEvent } from "@/lib/analytics";
import {
  deriveWLEndClientPath,
  ownerLabel,
  stateBadge,
  type ActivationMilestone,
  type ActivationPath,
} from "@/lib/governance/activation";

const ICON: Record<string, typeof Circle> = {
  complete: CheckCircle2,
  in_progress: Clock,
  blocked: AlertCircle,
  pending: Circle,
};

interface Props {
  wlClientId: string;
}

export function WLEndClientActivationCard({ wlClientId }: Props) {
  const [path, setPath] = useState<ActivationPath | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchWLClientServiceStatus(wlClientId)
      .then((row) => {
        if (!mounted) return;
        const built = deriveWLEndClientPath({
          accountStatus: row?.account_status ?? null,
          hasPublishedCampaign: (row?.published_campaigns ?? 0) > 0,
          hasLiveReceptionist: (row?.live_receptionist_flows ?? 0) > 0,
          hasReceptionistPending: (row?.pending_receptionist_flows ?? 0) > 0,
        });
        setPath(built);
        trackEvent({
          name: "activation_path_viewed",
          surface: "wl_end_client_portal",
          persona: "wl_client",
          properties: { completed: built.completedCount, total: built.totalCount, is_live: built.isLive },
        });
      })
      .catch(() => mounted && setPath(null))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [wlClientId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }
  if (!path) return null;
  const pct = path.totalCount > 0 ? Math.round((path.completedCount / path.totalCount) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Activation Status</CardTitle>
          <Badge variant={path.isLive ? "default" : "secondary"}>
            {path.isLive ? "Live" : `${path.completedCount}/${path.totalCount}`}
          </Badge>
        </div>
        <Progress value={pct} className="h-1.5 mt-2" />
        <p className="text-xs text-muted-foreground mt-2">
          Real status from your account, script, and receptionist setup. Your provider handles support items for you.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {path.milestones.map((m) => {
          const Icon = ICON[m.state] ?? Circle;
          const sb = stateBadge(m.state);
          const toneClass: Record<string, string> = {
            ok: "text-primary",
            info: "text-blue-500",
            warn: "text-destructive",
            muted: "text-muted-foreground",
          };
          return (
            <div key={m.key} className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${toneClass[sb.tone]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{m.label}</p>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wide">{ownerLabel(m.owner)}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{sb.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{m.detail}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default WLEndClientActivationCard;
