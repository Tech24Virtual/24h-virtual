import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { WhiteLabelLayout } from '@/components/white-label/WhiteLabelLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileText, Plus, Search } from 'lucide-react';
import { useWLPartnerProposals } from '@/hooks/wl/useWLPartnerProposals';
import { WLProposalStatusBadge } from '@/components/white-label/proposals/WLProposalStatusBadge';
import type { WLProposalStatus } from '@/hooks/wl/wlProposalTransitions';
import { SEO } from '@/components/SEO';

const STATUSES: Array<WLProposalStatus | 'all'> = [
  'all',
  'draft',
  'sent',
  'viewed',
  'accepted',
  'declined',
  'expired',
];

const LEAD_FILTERS = ['all', 'linked', 'unlinked'] as const;
type LeadFilter = (typeof LEAD_FILTERS)[number];

export default function WLProposals() {
  const { data: proposals, isLoading } = useWLPartnerProposals();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WLProposalStatus | 'all'>('all');
  const [leadFilter, setLeadFilter] = useState<LeadFilter>('all');

  const filtered = useMemo(() => {
    if (!proposals) return [];
    const q = search.trim().toLowerCase();
    return proposals.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (leadFilter === 'linked' && !p.lead_id) return false;
      if (leadFilter === 'unlinked' && p.lead_id) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.proposal_number.toLowerCase().includes(q) ||
        (p.offering_name?.toLowerCase().includes(q) ?? false) ||
        (p.lead?.name.toLowerCase().includes(q) ?? false) ||
        (p.lead?.company?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [proposals, search, statusFilter, leadFilter]);

  return (
    <WhiteLabelLayout>
      <SEO title="Proposals — White Label Partner" description="Manage your sales proposals" suppressBranding />
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Proposals</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Create, track, and manage your sales proposals
            </p>
          </div>
          <Button asChild>
            <Link to="/white-label-dashboard/clients/proposals/new">
              <Plus className="w-4 h-4 mr-2" />
              New Proposal
            </Link>
          </Button>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by title, number, lead, or company"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as WLProposalStatus | 'all')}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s === 'all' ? 'All statuses' : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={leadFilter} onValueChange={(v) => setLeadFilter(v as LeadFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All proposals</SelectItem>
                <SelectItem value="linked">Has linked lead</SelectItem>
                <SelectItem value="unlinked">No linked lead</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card>
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">No proposals yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                {proposals && proposals.length > 0
                  ? 'Try adjusting your filters.'
                  : 'Create your first proposal to get started.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proposal</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Valid until</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      window.location.assign(`/white-label-dashboard/clients/proposals/${p.id}`);
                    }}
                  >
                    <TableCell>
                      <div className="font-medium">{p.title}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {p.proposal_number}
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.lead ? (
                        <div>
                          <div className="text-sm">{p.lead.name}</div>
                          {p.lead.company && (
                            <div className="text-xs text-muted-foreground">
                              {p.lead.company}
                            </div>
                          )}
                        </div>
                      ) : p.lead_id ? (
                        <span className="text-xs text-muted-foreground italic">
                          Lead removed
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <WLProposalStatusBadge status={p.status} validUntil={p.valid_until} />
                    </TableCell>
                    <TableCell>
                      {p.amount != null ? (
                        <span>
                          {p.currency ? `${p.currency} ` : ''}
                          {p.amount.toLocaleString()}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {p.valid_until
                        ? new Date(p.valid_until).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(p.updated_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </WhiteLabelLayout>
  );
}
