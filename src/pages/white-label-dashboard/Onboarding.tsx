import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronRight, AlertCircle } from 'lucide-react';
import { useWLPartnerHandoffs, type WLHandoffStatus } from '@/hooks/wl/useWLPartnerHandoffs';
import {
  SUBMISSION_STATUS_LABEL,
  SUBMISSION_STATUS_VARIANT,
  type WLSubmissionStatus,
} from '@/lib/wl/fulfillmentStatus';
import { SEO } from '@/components/SEO';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const STATUS_VARIANT: Record<WLHandoffStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'outline',
  ready: 'secondary',
  in_progress: 'default',
  completed: 'secondary',
  blocked: 'destructive',
};

const STATUS_LABEL: Record<WLHandoffStatus, string> = {
  pending: 'Pending',
  ready: 'Ready',
  in_progress: 'In progress',
  completed: 'Completed',
  blocked: 'Blocked',
};

export default function WLOnboarding() {
  const { data: handoffs, isLoading } = useWLPartnerHandoffs();
  const [submissionFilter, setSubmissionFilter] = useState<WLSubmissionStatus | 'all'>('all');

  const handoffIds = useMemo(() => (handoffs ?? []).map((h) => h.id), [handoffs]);

  const { data: openRequestCounts } = useQuery({
    queryKey: ['wl-handoff-open-request-counts', handoffIds],
    enabled: handoffIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wl_partner_handoff_requests')
        .select('handoff_id')
        .in('handoff_id', handoffIds)
        .eq('status', 'open');
      if (error) throw error;
      const map = new Map<string, number>();
      (data ?? []).forEach((r: { handoff_id: string }) => {
        map.set(r.handoff_id, (map.get(r.handoff_id) ?? 0) + 1);
      });
      return map;
    },
  });

  const filtered = useMemo(() => {
    if (!handoffs) return [];
    if (submissionFilter === 'all') return handoffs;
    return handoffs.filter((h) => (h.submission_status ?? 'collecting_info') === submissionFilter);
  }, [handoffs, submissionFilter]);

  return (
    <>
      <SEO title="Onboarding — White Label Dashboard" description="Accepted proposals queued for onboarding" suppressBranding />
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Onboarding</h1>
            <p className="text-sm text-muted-foreground">
              Accepted proposals queued for client onboarding. Snapshots are frozen at the moment of acceptance.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Submission</span>
            <Select value={submissionFilter} onValueChange={(v) => setSubmissionFilter(v as typeof submissionFilter)}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {(Object.keys(SUBMISSION_STATUS_LABEL) as WLSubmissionStatus[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {SUBMISSION_STATUS_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : !filtered?.length ? (
          <Card className="p-12 text-center">
            <p className="font-medium">No handoffs match.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Handoffs are created automatically when a proposal is accepted.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((h) => {
              const sub = h.submission_status ?? 'collecting_info';
              return (
                <Link
                  key={h.id}
                  to={`/white-label-dashboard/clients/onboarding/${h.id}`}
                  className="block"
                >
                  <Card className="p-4 hover:border-primary/50 transition">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">
                            {h.client_name_snapshot || 'Unnamed client'}
                          </p>
                          <Badge variant={STATUS_VARIANT[h.status]}>
                            {STATUS_LABEL[h.status]}
                          </Badge>
                          {sub !== 'collecting_info' && (
                            <Badge variant={SUBMISSION_STATUS_VARIANT[sub]} className="text-xs">
                              {SUBMISSION_STATUS_LABEL[sub]}
                            </Badge>
                          )}
                          {(openRequestCounts?.get(h.id) ?? 0) > 0 && (
                            <Badge variant="destructive" className="text-xs gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {openRequestCounts?.get(h.id)} open request
                              {(openRequestCounts?.get(h.id) ?? 0) === 1 ? '' : 's'}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                          {h.proposal && (
                            <span className="font-mono">{h.proposal.proposal_number}</span>
                          )}
                          {h.proposal?.title && <span>{h.proposal.title}</span>}
                          {h.accepted_amount_snapshot != null && (
                            <span>
                              {h.currency_snapshot ? `${h.currency_snapshot} ` : ''}
                              {h.accepted_amount_snapshot.toLocaleString()}
                            </span>
                          )}
                          <span>
                            Accepted{' '}
                            {h.proposal?.accepted_at
                              ? new Date(h.proposal.accepted_at).toLocaleDateString()
                              : new Date(h.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
