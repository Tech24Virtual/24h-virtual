import { useMemo, useState } from 'react';
import { useCampaignRollup30d } from '@/hooks/campaign-os/useCampaignRollup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle } from 'lucide-react';

const TENANT_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'direct_24h', label: 'Direct 24H' },
  { key: 'wl_partner', label: 'WL Partners' },
  { key: 'wl_client', label: 'WL Clients' },
] as const;

function formatSeconds(s: number): string {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

export default function CampaignOsReporting() {
  const { data = [], isLoading, error, refetch } = useCampaignRollup30d();
  const [filter, setFilter] = useState<(typeof TENANT_FILTERS)[number]['key']>('all');

  const rows = useMemo(() => {
    if (filter === 'all') return data;
    return data.filter((r) => r.tenant_kind === filter);
  }, [data, filter]);

  const totalCalls = rows.reduce((acc, r) => acc + (r.calls_30d ?? 0), 0);
  const avgMissed =
    rows.length > 0
      ? Math.round(
          (rows.reduce((acc, r) => acc + (r.missed_pct ?? 0), 0) / rows.length) * 10
        ) / 10
      : 0;

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-10 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3 opacity-70" />
          <p className="font-medium">Failed to load reporting data</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            The view <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">v_campaign_rollup_30d</code> may not be accessible.
            Run: <code className="font-mono text-xs bg-muted px-1 rounded">GRANT SELECT ON public.v_campaign_rollup_30d TO authenticated;</code>
          </p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Cross-Campaign Reporting</h2>
        <p className="text-sm text-muted-foreground">
          30-day rollup across every campaign you can access. Attribution uses <code className="font-mono text-xs">client_report_mappings</code> (DNIS / campaign name / caller number).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Campaigns</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{rows.length}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">30-day calls</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : <p className="text-2xl font-bold">{totalCalls.toLocaleString()}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Avg missed %</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{avgMissed}%</p>}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {TENANT_FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? 'default' : 'outline'}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Campaigns, last 30 days</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4 items-center py-2 border-b last:border-0">
                  <Skeleton className="h-4 w-40 flex-1" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No campaigns in scope.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead className="text-right">30d Calls</TableHead>
                  <TableHead className="text-right">Avg AHT</TableHead>
                  <TableHead className="text-right">Missed %</TableHead>
                  <TableHead>Published?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.campaign_id}>
                    <TableCell className="font-medium max-w-[220px]">
                      <span className="truncate block" title={r.display_name ?? r.campaign_id}>
                        {r.display_name ?? r.campaign_id}
                      </span>
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.tenant_kind}</Badge></TableCell>
                    <TableCell className="text-right">{r.calls_30d.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{formatSeconds(Number(r.avg_handle_time_seconds))}</TableCell>
                    <TableCell className="text-right">{r.missed_pct != null ? `${r.missed_pct}%` : '—'}</TableCell>
                    <TableCell>
                      {r.published_version_id ? <Badge>published</Badge> : <Badge variant="secondary">unpublished</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
