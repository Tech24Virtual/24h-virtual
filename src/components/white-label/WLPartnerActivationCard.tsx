/**
 * Phase 15 — WL Partner Activation Card.
 * Structured partner activation milestones + portfolio rollout summary.
 * Tenant-safe: derives entirely from RLS-scoped Phase 6 views.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, CheckCircle2, Circle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { trackEvent, track } from "@/lib/analytics";
import {
  fetchPartnerPortfolioActivation,
  ownerLabel,
  stateBadge,
  type ActivationMilestone,
  type ActivationPath,
  type PartnerPortfolioActivation,
} from "@/lib/governance/activation";

const ICON: Record<string, typeof Circle> = {
  complete: CheckCircle2,
  in_progress: Clock,
  blocked: AlertCircle,
  pending: Circle,
};

interface Props {
  partnerId: string;
}

export function WLPartnerActivationCard({ partnerId }: Props) {
  const [path, setPath] = useState<ActivationPath | null>(null);
  const [portfolio, setPortfolio] = useState<PartnerPortfolioActivation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchPartnerPortfolioActivation(partnerId)
      .then((res) => {
        if (!mounted) return;
        setPath(res.path);
        setPortfolio(res.portfolio);
        trackEvent({
          name: "activation_path_viewed",
          surface: "wl_partner_dashboard",
          persona: "wl_partner",
          properties: { completed: res.path.completedCount, total: res.path.totalCount, fully_live: res.portfolio.fullyLive },
        });
      })
      .catch(() => {
        if (mounted) { setPath(null); setPortfolio(null); }
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [partnerId]);

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
          <CardTitle className="text-base">Partner Activation Path</CardTitle>
          <Badge variant={path.isLive ? "default" : "secondary"}>
            {path.completedCount}/{path.totalCount} milestones
          </Badge>
        </div>
        <Progress value={pct} className="h-1.5 mt-2" />
        <p className="text-xs text-muted-foreground mt-2">
          Real status from your branding, domain, and client portfolio. Not a cosmetic checklist.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {path.milestones.map((m) => (
            <MilestoneRow key={m.key} m={m} />
          ))}
        </div>

        {portfolio && portfolio.totalClients > 0 && (
          <div className="rounded-lg border border-border/60 p-3 bg-muted/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Portfolio Rollout
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Metric label="Clients" value={portfolio.totalClients} />
              <Metric label="With Script" value={portfolio.withScript} />
              <Metric label="Live Receptionists" value={portfolio.liveReceptionists} />
              <Metric label="Fully Live" value={portfolio.fullyLive} accent />
            </div>
            {(portfolio.blockedNoScript > 0 || portfolio.blockedReceptionistPending > 0) && (
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                {portfolio.blockedNoScript > 0 && (
                  <p>• {portfolio.blockedNoScript} active client{portfolio.blockedNoScript === 1 ? "" : "s"} have no published script.</p>
                )}
                {portfolio.blockedReceptionistPending > 0 && (
                  <p>• {portfolio.blockedReceptionistPending} client{portfolio.blockedReceptionistPending === 1 ? "" : "s"} have a receptionist pending live.</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <p className={`text-lg font-semibold ${accent ? "text-primary" : ""}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
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
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">{ownerLabel(m.owner)}</Badge>
          <Badge variant="secondary" className="text-[10px]">{sb.label}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{m.detail}</p>
      </div>
      {m.drillRoute && m.state !== "complete" && m.owner === "user_action" && (
        <Button asChild size="sm" variant="ghost">
          <Link
            to={m.drillRoute}
            onClick={() => track.cta("wl_partner_activation", "milestone_open", "wl_partner", { milestone: m.key })}
          >
            Open <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </Button>
      )}
    </div>
  );
}
