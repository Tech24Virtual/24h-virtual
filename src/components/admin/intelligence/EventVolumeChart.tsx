import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  fetchEventTrend30d,
  pivotEventTrend,
  INTELLIGENCE_DOMAINS,
  DOMAIN_LABEL,
  type IntelligenceDomain,
} from "@/lib/governance/intelligence";

const DOMAIN_COLORS: Record<IntelligenceDomain, string> = {
  growth: "hsl(142, 70%, 45%)",
  revenue: "hsl(var(--primary))",
  delivery: "hsl(38, 92%, 50%)",
  voice: "hsl(262, 80%, 60%)",
  wl: "hsl(199, 89%, 48%)",
  automation: "hsl(var(--cta))",
  system: "hsl(var(--muted-foreground))",
};

export function EventVolumeChart() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchEventTrend30d>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchEventTrend30d()
      .then((r) => { if (!cancelled) setRows(r); })
      .catch(() => { if (!cancelled) setRows([]); });
    return () => { cancelled = true; };
  }, []);

  const data = useMemo(() => (rows ? pivotEventTrend(rows, 30) : []), [rows]);
  const totals = useMemo(() => {
    const t: Record<IntelligenceDomain, number> = {
      growth: 0, revenue: 0, delivery: 0, voice: 0, wl: 0, automation: 0, system: 0,
    };
    for (const row of data) {
      for (const d of INTELLIGENCE_DOMAINS) t[d] += Number(row[d] ?? 0);
    }
    return t;
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Lifecycle Event Volume — Last 30 Days</CardTitle>
          <span className="text-xs text-muted-foreground">Source: dashboard_events</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {INTELLIGENCE_DOMAINS.map((d) => (
            <Badge key={d} variant="outline" className="text-xs">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: DOMAIN_COLORS[d] }} />
              {DOMAIN_LABEL[d]}: {totals[d]}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {rows === null ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No events recorded in the last 30 days.</p>
        ) : (
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: string) => v.slice(5)}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {INTELLIGENCE_DOMAINS.map((d) => (
                  <Line
                    key={d}
                    type="monotone"
                    dataKey={d}
                    name={DOMAIN_LABEL[d]}
                    stroke={DOMAIN_COLORS[d]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
