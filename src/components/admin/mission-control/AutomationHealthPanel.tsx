import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { fetchRecentCheckRuns, fetchDriftSummary, type AutomationCheckRun, type DriftSummary } from "@/lib/governance/automation";

export function AutomationHealthPanel() {
  const [runs, setRuns] = useState<AutomationCheckRun[] | null>(null);
  const [drift, setDrift] = useState<DriftSummary[] | null>(null);

  useEffect(() => {
    fetchRecentCheckRuns(10).then(setRuns).catch(() => setRuns([]));
    fetchDriftSummary().then(setDrift).catch(() => setDrift([]));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Automation Health</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Scheduled checks, drift summary, audit visibility. Fully read-only.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <section>
          <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Drift by domain</h4>
          {drift === null ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : drift.length === 0 ? (
            <p className="text-xs text-muted-foreground">No drift detected.</p>
          ) : (
            <ul className="space-y-1.5">
              {drift.map((d) => (
                <li key={d.domain} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{d.domain}</span>
                  <span className="flex items-center gap-2">
                    {d.warn_count > 0 && (
                      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px]">
                        {d.warn_count} warn
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px]">{d.open_count} open</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Recent check runs</h4>
          {runs === null ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : runs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No runs recorded yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {runs.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 truncate">
                    {r.status === "success" ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                    )}
                    <span className="truncate">{r.check_name}</span>
                    <Badge variant="outline" className="text-[10px]">{r.triggered_by}</Badge>
                  </span>
                  <span className="text-muted-foreground tabular-nums shrink-0">
                    +{r.recs_created} / -{r.recs_resolved}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
