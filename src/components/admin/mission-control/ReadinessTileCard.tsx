import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, type LucideIcon, Megaphone, TrendingUp, Truck, PhoneCall, Share2, AlertCircle, CheckCircle2, CircleHelp, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import type { DomainHealth, DomainReadinessTile } from "@/lib/governance/missionControl";

const DOMAIN_ICON: Record<DomainReadinessTile["domain"], LucideIcon> = {
  growth: Megaphone,
  revenue: TrendingUp,
  delivery: Truck,
  voice: PhoneCall,
  wl: Share2,
};

const HEALTH_META: Record<DomainHealth, { label: string; className: string; Icon: LucideIcon }> = {
  healthy: { label: "Healthy", className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", Icon: CheckCircle2 },
  attention: { label: "Attention", className: "bg-amber-500/15 text-amber-700 border-amber-500/30", Icon: AlertTriangle },
  blocked: { label: "Blocked", className: "bg-destructive/15 text-destructive border-destructive/30", Icon: AlertCircle },
  unknown: { label: "Unknown", className: "bg-muted text-muted-foreground border-border", Icon: CircleHelp },
};

export function ReadinessTileCard({ tile }: { tile: DomainReadinessTile }) {
  const Icon = DOMAIN_ICON[tile.domain];
  const health = HEALTH_META[tile.health];
  const HealthIcon = health.Icon;
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{tile.label}</CardTitle>
        </div>
        <Badge variant="outline" className={health.className}>
          <HealthIcon className="h-3 w-3 mr-1" />
          {health.label}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-3">
        <div>
          <div className="text-2xl font-semibold">{tile.headline}</div>
          <div className="text-sm text-muted-foreground">{tile.subline}</div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-auto">
          {tile.metrics.map((m) => (
            <div key={m.label} className="rounded-lg bg-muted/40 px-2 py-1.5 text-center">
              <div className="text-sm font-medium">{m.value}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.label}</div>
            </div>
          ))}
        </div>
        <Button asChild variant="ghost" size="sm" className="self-end">
          <Link to={tile.drillRoute}>
            Drill in <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
