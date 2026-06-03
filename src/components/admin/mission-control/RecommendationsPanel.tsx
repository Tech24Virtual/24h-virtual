import { useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ExternalLink, X, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import {
  fetchOpenRecommendations,
  runRecommendationChecksNow,
  dismissRecommendation,
  resolveRecommendation,
  AUTOMATION_TIER_INFO,
  type AutomationRecommendation,
  type AutomationSeverity,
} from "@/lib/governance/automation";

const SEVERITY_BADGE: Record<AutomationSeverity, string> = {
  info: "bg-muted text-muted-foreground",
  notice: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  warn: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  critical: "bg-destructive/15 text-destructive",
};

export function RecommendationsPanel() {
  const navigate = useNavigate();
  const [recs, setRecs] = useState<AutomationRecommendation[] | null>(null);
  const [running, setRunning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function load() {
    try {
      const data = await fetchOpenRecommendations({ limit: 200 });
      startTransition(() => setRecs(data));
    } catch (e: any) {
      toast({ title: "Failed to load recommendations", description: e.message, variant: "destructive" });
      setRecs([]);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleRunNow() {
    setRunning(true);
    try {
      const r = await runRecommendationChecksNow();
      toast({ title: "Checks complete", description: `${r.seen} active · ${r.created} new · ${r.resolved} auto-resolved` });
      await load();
    } catch (e: any) {
      toast({ title: "Run failed", description: e.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  }

  async function handleDismiss(rec: AutomationRecommendation) {
    setBusyId(rec.id);
    try {
      await dismissRecommendation(rec.id, "dismissed_from_mission_control");
      toast({ title: "Recommendation dismissed" });
      await load();
    } catch (e: any) {
      toast({ title: "Dismiss failed", description: e.message, variant: "destructive" });
    } finally { setBusyId(null); }
  }

  async function handleResolve(rec: AutomationRecommendation) {
    setBusyId(rec.id);
    try {
      await resolveRecommendation(rec.id, "manually_resolved");
      toast({ title: "Recommendation resolved" });
      await load();
    } catch (e: any) {
      toast({ title: "Resolve failed", description: e.message, variant: "destructive" });
    } finally { setBusyId(null); }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">Recommendations</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Deterministic, rule-based. Generated hourly + on demand from canonical readiness views.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleRunNow} disabled={running}>
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
          Run checks now
        </Button>
      </CardHeader>
      <CardContent>
        {recs === null ? (
          <div className="flex justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : recs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No open recommendations. The platform is operating within deterministic thresholds.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {recs.map((r) => (
              <li key={r.id} className="py-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] uppercase">{r.domain}</Badge>
                      <Badge className={`text-[10px] ${SEVERITY_BADGE[r.severity]}`}>{r.severity}</Badge>
                      <Badge variant="secondary" className="text-[10px]" title={AUTOMATION_TIER_INFO[r.tier].help}>
                        {AUTOMATION_TIER_INFO[r.tier].label}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mt-1">{r.title}</p>
                    {r.detail && <p className="text-xs text-muted-foreground mt-0.5">{r.detail}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {r.drill_route && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(r.drill_route!)}
                        title="Open in canonical admin surface"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === r.id}
                      onClick={() => handleResolve(r)}
                      title="Mark resolved"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === r.id}
                      onClick={() => handleDismiss(r)}
                      title="Dismiss"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
