import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronRight, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import {
  useFulfillmentIntakes,
  type FulfillmentIntake,
} from '@/hooks/admin/useFulfillmentIntakes';
import {
  INTAKE_STATUS_LABEL,
  INTAKE_STATUS_VARIANT,
  INTAKE_PRIORITY_LABEL,
  type IntakeStatus,
  type IntakePriority,
} from '@/lib/wl/fulfillmentStatus';

interface SnapshotShape {
  client?: { name?: string | null };
}

interface Props {
  mode?: 'admin' | 'supervisor';
}

export function FulfillmentIntakeQueue({ mode = 'admin' }: Props = {}) {
  const { data: intakes, isLoading, isError, refetch } = useFulfillmentIntakes();
  const [searchParams] = useSearchParams();
  const detailBase =
    mode === 'supervisor' ? '/staff/supervisor/fulfillment' : '/admin/fulfillment-intake';
  const [statusFilter, setStatusFilter] = useState<IntakeStatus | 'all'>(
    (searchParams.get('status') as IntakeStatus) || 'all',
  );
  const [priorityFilter, setPriorityFilter] = useState<IntakePriority | 'all'>(
    (searchParams.get('priority') as IntakePriority) || 'all',
  );
  const [partnerFilter, setPartnerFilter] = useState<string>(
    searchParams.get('partner') || 'all',
  );
  const [missingOnly, setMissingOnly] = useState(false);
  const [search, setSearch] = useState('');

  const partners = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of intakes ?? []) {
      if (i.partner?.id) {
        map.set(i.partner.id, i.partner.company_name ?? 'Unnamed');
      }
    }
    return Array.from(map.entries());
  }, [intakes]);

  const filtered = useMemo(() => {
    return (intakes ?? []).filter((i) => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && i.priority !== priorityFilter) return false;
      if (partnerFilter !== 'all' && i.partner_id !== partnerFilter) return false;
      if (missingOnly && i.status !== 'needs_partner_update') return false;
      if (search) {
        const snap = i.snapshot_json as unknown as SnapshotShape;
        const haystack = `${i.intake_number} ${i.partner?.company_name ?? ''} ${snap?.client?.name ?? ''}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [intakes, statusFilter, priorityFilter, partnerFilter, missingOnly, search]);

  const kpis = useMemo(() => {
    const list = intakes ?? [];
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    return {
      newSub: list.filter((i) => i.status === 'new_submission').length,
      review: list.filter((i) => i.status === 'under_review').length,
      needs: list.filter((i) => i.status === 'needs_partner_update').length,
      activated: list.filter(
        (i) => i.activated_at && new Date(i.activated_at) >= monthStart,
      ).length,
    };
  }, [intakes]);

  const renderClient = (i: FulfillmentIntake) => {
    const snap = i.snapshot_json as unknown as SnapshotShape;
    return snap?.client?.name ?? '—';
  };

  if (isError) return (
    <Card className="p-8 text-center">
      <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
      <p className="font-medium">Failed to load fulfillment intakes</p>
      <p className="text-sm text-muted-foreground mt-1">Check your permissions or try refreshing</p>
      <Button variant="outline" className="mt-4" onClick={() => refetch()}>Retry</Button>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'New', value: kpis.newSub },
          { label: 'Under review', value: kpis.review },
          { label: 'Needs partner update', value: kpis.needs },
          { label: 'Activated this month', value: kpis.activated },
        ].map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="text-2xl font-semibold mt-1">{k.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1 flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground">Search</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Intake number, partner, client…"
            />
          </div>
          <div className="space-y-1 min-w-[160px]">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as IntakeStatus | 'all')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {(Object.keys(INTAKE_STATUS_LABEL) as IntakeStatus[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {INTAKE_STATUS_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[140px]">
            <label className="text-xs text-muted-foreground">Priority</label>
            <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as IntakePriority | 'all')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {(Object.keys(INTAKE_PRIORITY_LABEL) as IntakePriority[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {INTAKE_PRIORITY_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[180px]">
            <label className="text-xs text-muted-foreground">Partner</label>
            <Select value={partnerFilter} onValueChange={setPartnerFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All partners</SelectItem>
                {partners.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pb-1">
            <Switch checked={missingOnly} onCheckedChange={setMissingOnly} id="missing" />
            <label htmlFor="missing" className="text-sm">
              Missing-info only
            </label>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Intake #</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Version</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-12">
                    No intakes match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((i) => (
                  <TableRow key={i.id} className="cursor-pointer hover:bg-muted/40">
                    <TableCell className="font-mono text-xs">
                      <Link to={`${detailBase}/${i.id}`}>{i.intake_number}</Link>
                    </TableCell>
                    <TableCell>{i.partner?.company_name ?? '—'}</TableCell>
                    <TableCell>{renderClient(i)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(i.submitted_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={INTAKE_STATUS_VARIANT[i.status]}>
                        {INTAKE_STATUS_LABEL[i.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {INTAKE_PRIORITY_LABEL[i.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">v{i.snapshot_version}</TableCell>
                    <TableCell>
                      <Link to={`${detailBase}/${i.id}`}>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
