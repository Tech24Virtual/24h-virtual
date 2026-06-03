/**
 * Phase 15 — Activation Funnel / Friction Panel (admin-only).
 * Aggregates direct client + receptionist signals into a clear funnel
 * + ranked list of where activation commonly stalls. No PII, no
 * cross-tenant client lists rendered to non-admins.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, AlertTriangle } from "lucide-react";
import {
  fetchActivationFriction,
  type ActivationFrictionSummary,
} from "@/lib/governance/activation";

export function ActivationFunnelPanel() {
  const [data, setData] = useState<ActivationFrictionSummary | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchActivationFriction()
      .then((r) => { if (!cancelled) setData(r); })
      .catch(() => { if (!cancelled) setData(null); });
    return () => { cancelled = true; };
  }, []);

  if (data === undefined) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }
  if (!data) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Activation friction data unavailable. Ensure delivery and receptionist views are populated.
        </CardContent>
      </Card>
    );
  }

  const totalFunnel = data.funnel.reduce((s, f) => s + f.count, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Activation Funnel
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Direct-client distribution across canonical service states. Live = answering calls.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {data.funnel.map((f) => {
              const pct = totalFunnel > 0 ? Math.round((f.count / totalFunnel) * 100) : 0;
              const isLive = f.stage === "live";
              return (
                <div
                  key={f.stage}
                  className={`rounded-lg border p-3 ${isLive ? "border-primary/40 bg-primary/5" : "border-border/60"}`}
                >
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{f.label}</p>
                  <p className={`text-2xl font-semibold mt-1 ${isLive ? "text-primary" : ""}`}>{f.count}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{pct}% of accounts</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Where Activation Stalls
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Buckets are derived from canonical readiness, fulfillment, and receptionist views. An account can appear in more than one bucket.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.buckets
            .slice()
            .sort((a, b) => b.count - a.count)
            .map((b) => (
              <div key={b.key} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{b.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{b.detail}</p>
                </div>
                <Badge variant={b.count > 0 ? "secondary" : "outline"} className="shrink-0">
                  {b.count}
                </Badge>
              </div>
            ))}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground">
        Computed {new Date(data.computedAt).toLocaleString()} · Read-only · admin scope.
      </p>
    </div>
  );
}

export default ActivationFunnelPanel;
