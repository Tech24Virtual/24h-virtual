/**
 * Phase 12 — Partner-facing nudges (read-only).
 * Derived from Phase 6 readiness + Phase 12 partner insights.
 * Surfaces "what's next" without exposing automation internals.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, AlertCircle, CheckCircle2, Info } from "lucide-react";
import {
  fetchPartnerExperience,
  type PartnerNudge,
} from "@/lib/governance/partnerExperience";

interface Props {
  partnerId: string;
}

const ICONS = {
  action: AlertCircle,
  info: Info,
  ok: CheckCircle2,
} as const;

export function WLPartnerNudgesCard({ partnerId }: Props) {
  const [nudges, setNudges] = useState<PartnerNudge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchPartnerExperience(partnerId)
      .then((r) => mounted && setNudges(r.nudges))
      .catch(() => mounted && setNudges([]))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [partnerId]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">What's Next</CardTitle>
          {!loading && nudges.length > 0 && (
            <Badge variant="secondary">{nudges.filter((n) => n.tone === "action").length} action items</Badge>
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
                  {n.drillRoute && (
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
