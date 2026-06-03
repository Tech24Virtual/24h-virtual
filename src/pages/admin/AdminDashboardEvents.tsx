import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { usePageView } from "@/lib/analytics";
import { format } from "date-fns";

interface EventRow {
  id: string;
  event_name: string;
  surface: string;
  persona: string;
  target: string | null;
  path: string | null;
  occurred_at: string;
  user_id: string | null;
  session_id: string | null;
}

interface Aggregate {
  key: string;
  count: number;
  uniqueSessions: number;
  uniqueUsers: number;
}

const RANGES: Record<string, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
};

export default function AdminDashboardEvents() {
  usePageView("admin_dashboard_events", "admin");
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<keyof typeof RANGES>("7d");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - RANGES[range] * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("dashboard_events")
        .select("id,event_name,surface,persona,target,path,occurred_at,user_id,session_id")
        .gte("occurred_at", since)
        .order("occurred_at", { ascending: false })
        .limit(1000);
      if (cancelled) return;
      if (error) console.warn("dashboard_events fetch error", error);
      setRows((data as EventRow[] | null) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const aggregateBy = (
    grouper: (r: EventRow) => string,
  ): Aggregate[] => {
    const map = new Map<string, { count: number; sessions: Set<string>; users: Set<string> }>();
    for (const r of rows) {
      const k = grouper(r);
      if (!map.has(k)) map.set(k, { count: 0, sessions: new Set(), users: new Set() });
      const v = map.get(k)!;
      v.count += 1;
      if (r.session_id) v.sessions.add(r.session_id);
      if (r.user_id) v.users.add(r.user_id);
    }
    return Array.from(map.entries())
      .map(([key, v]) => ({ key, count: v.count, uniqueSessions: v.sessions.size, uniqueUsers: v.users.size }))
      .sort((a, b) => b.count - a.count);
  };

  const bySurfaceTarget = useMemo(() => aggregateBy((r) => `${r.surface} → ${r.target ?? "(none)"}`), [rows]);
  const bySurface = useMemo(() => aggregateBy((r) => r.surface), [rows]);
  const byPersona = useMemo(() => aggregateBy((r) => r.persona), [rows]);
  const byEventName = useMemo(() => aggregateBy((r) => r.event_name), [rows]);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-heading">Dashboard Events</h1>
        <p className="text-muted-foreground mt-1">CTA, tab, and quick action analytics across all persona dashboards</p>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-muted-foreground">Range:</span>
        <Select value={range} onValueChange={(v) => setRange(v as keyof typeof RANGES)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary">{loading ? "Loading…" : `${rows.length.toLocaleString()} events`}</Badge>
      </div>

      <Tabs defaultValue="targets">
        <TabsList>
          <TabsTrigger value="targets">CTAs &amp; Tabs</TabsTrigger>
          <TabsTrigger value="surfaces">Surfaces</TabsTrigger>
          <TabsTrigger value="personas">Personas</TabsTrigger>
          <TabsTrigger value="events">Event Types</TabsTrigger>
          <TabsTrigger value="raw">Raw Stream</TabsTrigger>
        </TabsList>

        <TabsContent value="targets" className="mt-4">
          <AggregateTable title="Top CTAs / Tabs / Quick Actions" rows={bySurfaceTarget} keyLabel="Surface → Target" />
        </TabsContent>
        <TabsContent value="surfaces" className="mt-4">
          <AggregateTable title="Most Active Surfaces" rows={bySurface} keyLabel="Surface" />
        </TabsContent>
        <TabsContent value="personas" className="mt-4">
          <AggregateTable title="Activity by Persona" rows={byPersona} keyLabel="Persona" />
        </TabsContent>
        <TabsContent value="events" className="mt-4">
          <AggregateTable title="Event Types" rows={byEventName} keyLabel="Event" />
        </TabsContent>
        <TabsContent value="raw" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Raw Event Stream (latest 1,000)</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Surface</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Persona</TableHead>
                    <TableHead>Path</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 200).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">{format(new Date(r.occurred_at), "MMM d HH:mm:ss")}</TableCell>
                      <TableCell className="text-xs"><Badge variant="outline">{r.event_name}</Badge></TableCell>
                      <TableCell className="text-xs">{r.surface}</TableCell>
                      <TableCell className="text-xs">{r.target ?? "—"}</TableCell>
                      <TableCell className="text-xs">{r.persona}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.path ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

function AggregateTable({ title, rows, keyLabel }: { title: string; rows: Aggregate[]; keyLabel: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{keyLabel}</TableHead>
              <TableHead className="text-right">Events</TableHead>
              <TableHead className="text-right">Unique Sessions</TableHead>
              <TableHead className="text-right">Unique Users</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No data in this range yet.</TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.key}>
                <TableCell className="text-sm">{r.key}</TableCell>
                <TableCell className="text-right text-sm font-mono">{r.count.toLocaleString()}</TableCell>
                <TableCell className="text-right text-sm font-mono">{r.uniqueSessions.toLocaleString()}</TableCell>
                <TableCell className="text-right text-sm font-mono">{r.uniqueUsers.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
