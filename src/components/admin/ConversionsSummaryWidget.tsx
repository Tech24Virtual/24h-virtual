import { useEffect, useMemo, useState } from 'react';
import { format, subDays, startOfDay } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, BarChart3, Building2, Users } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';

interface EventRow {
  id: string;
  occurred_at: string;
  persona: string | null;
  properties: Record<string, unknown> | null;
}

const RANGE_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

interface DayBucket {
  day: string; // YYYY-MM-DD
  label: string; // MMM d
  direct: number;
  wl_partner: number;
  total: number;
}

export function ConversionsSummaryWidget() {
  const [range, setRange] = useState<keyof typeof RANGE_DAYS>('30d');
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const days = RANGE_DAYS[range];
      const since = startOfDay(subDays(new Date(), days - 1)).toISOString();

      const { data, error } = await supabase
        .from('dashboard_events')
        .select('id, occurred_at, persona, properties')
        .eq('target', 'convert_lead_to_account')
        .gte('occurred_at', since)
        .order('occurred_at', { ascending: true })
        .limit(2000);

      if (cancelled) return;
      if (error) {
        console.warn('conversions-summary fetch error', error);
        setEvents([]);
      } else {
        setEvents((data ?? []) as EventRow[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const { buckets, totals } = useMemo(() => {
    const days = RANGE_DAYS[range];
    const today = startOfDay(new Date());
    const map = new Map<string, DayBucket>();
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(today, i);
      const key = format(d, 'yyyy-MM-dd');
      map.set(key, {
        day: key,
        label: format(d, 'MMM d'),
        direct: 0,
        wl_partner: 0,
        total: 0,
      });
    }

    let direct = 0;
    let wl = 0;
    let firstTime = 0;
    let reruns = 0;

    for (const e of events) {
      const props = e.properties ?? {};
      const tenantKind = (props.tenant_kind as string | undefined) ??
        (e.persona === 'wl_partner' ? 'wl_partner' : 'direct_24h');
      const isRerun = props.already_existed === true;
      if (isRerun) reruns += 1;
      else firstTime += 1;

      const key = format(startOfDay(new Date(e.occurred_at)), 'yyyy-MM-dd');
      const bucket = map.get(key);
      if (!bucket) continue;
      if (tenantKind === 'wl_partner') {
        bucket.wl_partner += 1;
        wl += 1;
      } else {
        bucket.direct += 1;
        direct += 1;
      }
      bucket.total += 1;
    }

    return {
      buckets: Array.from(map.values()),
      totals: {
        direct,
        wl,
        all: direct + wl,
        firstTime,
        reruns,
      },
    };
  }, [events, range]);

  const peak = useMemo(
    () => buckets.reduce((m, b) => (b.total > m.total ? b : m), buckets[0]),
    [buckets],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Lead to Account Conversions
            </CardTitle>
            <CardDescription>
              Daily activations by tenant kind. Tracks performance of the convert flow across
              direct and white label paths.
            </CardDescription>
          </div>
          <Select value={range} onValueChange={(v) => setRange(v as keyof typeof RANGE_DAYS)}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* KPI tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiTile
            label="Total"
            value={totals.all}
            icon={<TrendingUp className="h-4 w-4" />}
            loading={loading}
          />
          <KpiTile
            label="Direct"
            value={totals.direct}
            icon={<Building2 className="h-4 w-4" />}
            accent="text-primary"
            loading={loading}
          />
          <KpiTile
            label="WL Partner"
            value={totals.wl}
            icon={<Users className="h-4 w-4" />}
            accent="text-accent"
            loading={loading}
          />
          <KpiTile
            label="First time"
            value={totals.firstTime}
            sublabel={`${totals.reruns} re-run${totals.reruns === 1 ? '' : 's'}`}
            icon={<Badge variant="outline" className="text-[10px] h-4 px-1">new</Badge>}
            loading={loading}
          />
        </div>

        {/* Chart */}
        {loading ? (
          <Skeleton className="h-[220px] w-full" />
        ) : totals.all === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
            No conversions in this window yet.
          </div>
        ) : (
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  interval={buckets.length > 30 ? 6 : 'preserveStartEnd'}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(l) => `Day: ${l}`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="direct"
                  stackId="a"
                  name="Direct"
                  fill="hsl(var(--primary))"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="wl_partner"
                  stackId="a"
                  name="WL Partner"
                  fill="hsl(var(--accent))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {peak && totals.all > 0 && (
          <p className="text-xs text-muted-foreground">
            Peak day: <span className="font-medium text-foreground">{peak.label}</span> with{' '}
            {peak.total} conversion{peak.total === 1 ? '' : 's'}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface KpiTileProps {
  label: string;
  value: number;
  sublabel?: string;
  icon?: React.ReactNode;
  accent?: string;
  loading?: boolean;
}

function KpiTile({ label, value, sublabel, icon, accent, loading }: KpiTileProps) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className={accent}>{icon}</span>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-16 mt-1" />
      ) : (
        <div className={`text-2xl font-semibold mt-0.5 ${accent ?? ''}`}>{value}</div>
      )}
      {sublabel && <div className="text-[11px] text-muted-foreground mt-0.5">{sublabel}</div>}
    </div>
  );
}

export default ConversionsSummaryWidget;
