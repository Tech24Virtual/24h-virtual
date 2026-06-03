/**
 * Phase 12 — 30-day call trend card for the client dashboard
 * (direct or WL end-client). Reuses RLS-scoped call_logs / wl_call_logs.
 * Lightweight Recharts area chart with summary tiles.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  fetchClientCallTrend,
  type ClientCallTrend,
} from "@/lib/governance/clientExperience";

interface Props {
  scope: "direct" | "wl";
  clientId: string;
  title?: string;
}

export function ClientCallTrendCard({ scope, clientId, title = "30-Day Call Trend" }: Props) {
  const [trend, setTrend] = useState<ClientCallTrend | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchClientCallTrend({ scope, clientId })
      .then((r) => mounted && setTrend(r))
      .catch(() => mounted && setTrend(null))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [scope, clientId]);

  const delta = trend?.weekOverWeekDelta ?? 0;
  const DeltaIcon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  const deltaTone =
    delta > 0 ? "text-green-600" : delta < 0 ? "text-cta" : "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          {trend && (
            <Badge variant="secondary" className="gap-1">
              <DeltaIcon className={`h-3 w-3 ${deltaTone}`} />
              <span className={deltaTone}>
                {delta > 0 ? "+" : ""}
                {delta} wk/wk
              </span>
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !trend || trend.totalCalls === 0 ? (
          <p className="text-sm text-muted-foreground">No call activity in the last 30 days yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
              <Tile label="Calls" value={trend.totalCalls} />
              <Tile label="Minutes" value={trend.totalMinutes} />
              <Tile label="Missed" value={trend.missedCalls} />
              <Tile label="After Hours" value={trend.afterHoursCalls} />
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend.days}>
                  <defs>
                    <linearGradient id="callTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" hide />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      fontSize: "12px",
                    }}
                    labelFormatter={(d) => new Date(d as string).toLocaleDateString()}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--primary))"
                    fill="url(#callTrend)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
