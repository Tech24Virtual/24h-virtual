import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2, XCircle, Clock, Loader2, LayoutGrid, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useGoLiveReadinessDashboard } from '@/hooks/campaign-os/useGoLiveReadiness';
import type { GoLiveSnapshot } from '@/hooks/campaign-os/useGoLiveSnapshot';

type CheckKey = keyof Pick<
  GoLiveSnapshot,
  'script_published' | 'faqs_ok' | 'policies_ok' | 'training_ok' | 'client_confirmed' | 'supervisor_approved' | 'five9_ok' | 'all_ok'
>;

const COLUMNS: { key: CheckKey; label: string; fiveNinePlaceholder?: boolean }[] = [
  { key: 'script_published', label: 'Script' },
  { key: 'faqs_ok',          label: 'FAQs' },
  { key: 'policies_ok',      label: 'Policies' },
  { key: 'training_ok',      label: 'Training' },
  { key: 'client_confirmed', label: 'Client' },
  { key: 'supervisor_approved', label: 'Supervisor' },
  { key: 'five9_ok',         label: 'Five9', fiveNinePlaceholder: true },
  { key: 'all_ok',           label: 'All OK' },
];

function Cell({ ok, placeholder }: { ok: boolean; placeholder?: boolean }) {
  if (placeholder) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" /> Pending
      </span>
    );
  }
  return ok ? (
    <CheckCircle2 className="h-4 w-4 text-status-success" aria-label="Pass" />
  ) : (
    <XCircle className="h-4 w-4 text-status-warning" aria-label="Fail" />
  );
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft:    'secondary',
  active:   'default',
  paused:   'outline',
  archived: 'destructive',
};

export default function CampaignOsReadiness() {
  const { data, isLoading, error, refetch, isFetching } = useGoLiveReadinessDashboard();

  const total      = data?.length ?? 0;
  const allOkCount = data?.filter((r) => r.snapshot?.all_ok).length ?? 0;
  const noSnapshot = data?.filter((r) => !r.snapshot).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            Campaign Readiness
          </h2>
          <p className="text-sm text-muted-foreground">
            Live go-live readiness state for every active campaign. Click a row to open its detail
            page.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Refresh readiness"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      {!isLoading && !error && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="py-3">
              <div className="text-xs text-muted-foreground">Total campaigns</div>
              <div className="text-2xl font-bold">{total}</div>
            </CardContent>
          </Card>
          <Card className="border-status-success">
            <CardContent className="py-3">
              <div className="text-xs text-muted-foreground">All checks passed</div>
              <div className="text-2xl font-bold text-status-success">{allOkCount}</div>
            </CardContent>
          </Card>
          <Card className="border-status-warning">
            <CardContent className="py-3">
              <div className="text-xs text-muted-foreground">Checks failing</div>
              <div className="text-2xl font-bold text-status-warning">
                {total - allOkCount - noSnapshot}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3">
              <div className="text-xs text-muted-foreground">No snapshot yet</div>
              <div className="text-2xl font-bold">{noSnapshot}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading readiness…
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            Could not load readiness data.{' '}
            <Button variant="link" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && total === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No active campaigns found.
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && total > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All campaigns</CardTitle>
            <CardDescription>
              Green ✅ = check passes · Orange ✗ = check failing · Clock = placeholder
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">Campaign</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  {COLUMNS.map((col) => (
                    <TableHead key={col.key} className="text-center min-w-[70px] text-xs">
                      {col.label}
                    </TableHead>
                  ))}
                  <TableHead className="hidden md:table-cell text-right text-xs">
                    Last updated
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.map((row) => (
                  <TableRow
                    key={row.campaign_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      window.open(
                        `/admin/campaign-os/campaigns/${row.campaign_id}?tab=go-live`,
                        '_self'
                      )
                    }
                  >
                    <TableCell>
                      <div className="font-medium truncate max-w-[200px]">
                        {row.campaign_name}
                      </div>
                      <div className="text-xs text-muted-foreground">{row.tenant_kind}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={STATUS_VARIANT[row.campaign_status] ?? 'outline'}>
                        {row.campaign_status}
                      </Badge>
                    </TableCell>
                    {COLUMNS.map((col) => (
                      <TableCell key={col.key} className="text-center">
                        {!row.snapshot ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <Cell
                            ok={row.snapshot[col.key] as boolean}
                            placeholder={col.fiveNinePlaceholder}
                          />
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="hidden md:table-cell text-right text-xs text-muted-foreground">
                      {row.snapshot
                        ? formatDistanceToNow(new Date(row.snapshot.last_evaluated_at), {
                            addSuffix: true,
                          })
                        : 'Never'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card className="border-dashed">
        <CardContent className="py-3 text-xs text-muted-foreground space-y-1">
          <div className="font-medium text-foreground mb-1">Column key</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1">
            <span><strong>Script</strong> — published script version</span>
            <span><strong>FAQs</strong> — ≥1 approved FAQ in scope</span>
            <span><strong>Policies</strong> — ≥1 approved policy</span>
            <span><strong>Training</strong> — all required modules signed off</span>
            <span><strong>Client</strong> — client confirmed readiness</span>
            <span><strong>Supervisor</strong> — supervisor signed off</span>
            <span><strong>Five9</strong> — placeholder (System 10)</span>
            <span><strong>All OK</strong> — all 6 gates pass</span>
          </div>
          <div className="pt-1">
            Click any row to open that campaign's go-live tab. Use{' '}
            <Link
              to="/admin/campaign-os/campaigns"
              className="underline hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              Campaigns
            </Link>{' '}
            to manage individual campaigns.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
