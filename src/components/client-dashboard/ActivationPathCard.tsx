/**
 * Phase 15 — Activation Path Card (direct client).
 * Reads canonical delivery + receptionist + script signals and renders
 * the structured activation milestones with clear "you vs support" ownership.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, CheckCircle2, Circle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { fetchMyDeliveryStatus } from "@/lib/governance/deliveryOverview";
import { fetchMyReceptionistSummary } from "@/lib/governance/voiceOverview";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { track, trackEvent } from "@/lib/analytics";
import {
  deriveDirectClientPath,
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

export function ActivationPathCard() {
  const { user } = useAuth();
  const [path, setPath] = useState<ActivationPath | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      try {
        const [delivery, voice, scriptsRes, leadRes] = await Promise.all([
          fetchMyDeliveryStatus().catch(() => null),
          fetchMyReceptionistSummary().catch(() => null),
          (supabase as any)
            .from("client_scripts")
            .select("id", { count: "exact", head: true })
            .eq("client_id", user.id)
            .eq("is_active", true),
          supabase
            .from("leads")
            .select("onboarding_checklist")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        const checklist = (leadRes?.data?.onboarding_checklist ?? {}) as Record<string, unknown>;
        const requiredKeys = [
          "business_name",
          "primary_contact_name",
          "primary_contact_phone",
          "business_hours",
          "time_zone",
        ];
        const intakeChecklistComplete = requiredKeys.every((k) => checklist[k] === true);

        const built = deriveDirectClientPath({
          serviceState: delivery?.service_state ?? null,
          fulfillmentStatus: delivery?.fulfillment_status ?? null,
          hasActiveScript: (scriptsRes?.count ?? 0) > 0,
          liveCampaigns: delivery?.live_campaigns_count ?? 0,
          receptionistLive: (voice?.live_count ?? 0) > 0,
          receptionistPending: (voice?.pending_count ?? 0) > 0,
          intakeChecklistComplete,
        });
        if (mounted) {
          setPath(built);
          trackEvent({
            name: "activation_path_viewed",
            surface: "client_dashboard",
            persona: "client",
            properties: {
              audience: built.audience,
              completed: built.completedCount,
              total: built.totalCount,
              is_live: built.isLive,
            },
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

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
          <CardTitle className="text-base">Your Activation Path</CardTitle>
          <Badge variant={path.isLive ? "default" : "secondary"}>
            {path.isLive ? "Live" : `${path.completedCount}/${path.totalCount} complete`}
          </Badge>
        </div>
        <Progress value={pct} className="h-1.5 mt-2" />
        <p className="text-xs text-muted-foreground mt-2">
          Progress reflects real system signals — script status, intake completion, receptionist readiness, and delivery state.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {path.milestones.map((m) => (
          <MilestoneRow key={m.key} m={m} />
        ))}
      </CardContent>
    </Card>
  );
}

function MilestoneRow({ m }: { m: ActivationMilestone }) {
  const Icon = ICON[m.state] ?? Circle;
  const sb = stateBadge(m.state);
  const toneClass: Record<string, string> = {
    ok: "text-primary",
    info: "text-blue-500",
    warn: "text-destructive",
    muted: "text-muted-foreground",
  };
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${toneClass[sb.tone]}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">{m.label}</p>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
            {ownerLabel(m.owner)}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">{sb.label}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{m.detail}</p>
      </div>
      {m.drillRoute && m.state !== "complete" && m.owner === "user_action" && (
        <Button asChild size="sm" variant="ghost">
          <Link
            to={m.drillRoute}
            onClick={() =>
              track.cta("client_activation", "milestone_open", "client", { milestone: m.key })
            }
          >
            Open <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </Button>
      )}
    </div>
  );
}
