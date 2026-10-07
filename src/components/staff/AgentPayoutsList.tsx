import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, DollarSign, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AgentPayoutSheet } from '@/components/billing/AgentPayoutSheet';
import {
  calcPayoutAmount, canProcessAutomatically, describeRate, type AgentPayoutProfile,
} from '@/lib/billing/payout';

interface AgentPayoutsListProps {
  statusFilter: 'supervisor_approved' | 'paid';
}

type ShiftInvoice = Tables<'shift_invoices'>;

interface InvoiceRow extends ShiftInvoice {
  agent_name: string;
  profile: AgentPayoutProfile | undefined;
}

export function AgentPayoutsList({ statusFilter }: AgentPayoutsListProps) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['payout-invoices', statusFilter],
    queryFn: async (): Promise<InvoiceRow[]> => {
      const { data: invoiceData, error } = await supabase
        .from('shift_invoices')
        .select('*')
        .eq('status', statusFilter)
        .order('period_start', { ascending: false });
      if (error) throw error;
      if (!invoiceData?.length) return [];

      const agentIds = [...new Set(invoiceData.map(i => i.agent_id))];

      // One role-checked RPC supplies agent names, pay terms and masked banking. Billing cannot read
      // profiles directly, so reading them client-side left every agent as "Unknown Agent".
      const { data: profileData, error: profileError } = await supabase.rpc('billing_agent_payout_profiles', {
        p_agent_ids: agentIds,
      });
      if (profileError) throw profileError;
      const profileMap = new Map(((profileData ?? []) as unknown as AgentPayoutProfile[]).map(p => [p.agent_id, p]));

      return invoiceData.map(inv => ({
        ...inv,
        agent_name: profileMap.get(inv.agent_id)?.full_name || 'Unknown Agent',
        profile: profileMap.get(inv.agent_id),
      }));
    },
  });

  const processPayoutMutation = useMutation({
    mutationFn: async (invoiceIds: string[]) => {
      setProcessingIds(new Set(invoiceIds));
      const { data, error } = await supabase.functions.invoke('process-agent-payout', {
        body: { invoice_ids: invoiceIds },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payout-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['agent-invoice-history'] });
      setSelectedIds(new Set());
      setProcessingIds(new Set());
      setDetailId(null);

      const results = data?.results || [];
      const successes = results.filter((r: any) => r.success).length;
      const failures = results.filter((r: any) => !r.success).length;

      if (successes > 0) toast.success(`${successes} payout(s) processed`);
      if (failures > 0) toast.error(`${failures} payout(s) failed`);
    },
    onError: (err: any) => {
      setProcessingIds(new Set());
      toast.error(err.message || 'Failed to process payouts');
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectable = invoices.filter(i => canProcessAutomatically(i.profile));

  const toggleAll = () => {
    if (selectedIds.size === selectable.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectable.map(i => i.id)));
    }
  };

  const isPending = statusFilter === 'supervisor_approved';
  const detail = invoices.find(i => i.id === detailId) ?? null;

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {isPending ? 'No approved invoices pending payout.' : 'No paid invoices yet.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isPending && selectedIds.size > 0 && (
        <div className="flex items-center gap-3">
          <Button
            onClick={() => processPayoutMutation.mutate(Array.from(selectedIds))}
            disabled={processPayoutMutation.isPending}
          >
            {processPayoutMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <DollarSign className="w-4 h-4 mr-2" />
            )}
            Process {selectedIds.size} Selected
          </Button>
          <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
        </div>
      )}

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {isPending && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectable.length > 0 && selectedIds.size === selectable.length}
                    onCheckedChange={toggleAll}
                    disabled={selectable.length === 0}
                  />
                </TableHead>
              )}
              <TableHead>Agent</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Net Hours</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Banking</TableHead>
              {isPending && <TableHead>Action</TableHead>}
              {!isPending && <TableHead>Paid</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map(inv => {
              const { amount, basis } = calcPayoutAmount(inv, inv.profile);
              const rate = describeRate(inv.profile);
              const auto = canProcessAutomatically(inv.profile);
              const isProcessing = processingIds.has(inv.id);
              const hasBanking = !!inv.profile?.has_banking;
              const monthly = inv.profile?.pay_type === 'monthly';

              return (
                <TableRow
                  key={inv.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setDetailId(inv.id)}
                >
                  {isPending && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(inv.id)}
                        onCheckedChange={() => toggleSelect(inv.id)}
                        disabled={!auto}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{inv.agent_name}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(inv.period_start), 'MMM d')} – {format(new Date(inv.period_end), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">{Number(inv.net_hours).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    {rate ?? <span className="text-destructive text-xs">Not set</span>}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {amount ? `$${amount.toFixed(2)}` : '—'}
                    {basis === 'monthly' && <div className="text-[11px] font-normal text-muted-foreground">monthly rate</div>}
                  </TableCell>
                  <TableCell>
                    {hasBanking ? (
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        <CheckCircle className="w-3 h-3 mr-1" /> On file
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-orange-700 border-orange-300">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Missing
                      </Badge>
                    )}
                  </TableCell>
                  {isPending && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!auto || isProcessing}
                        title={monthly ? 'Monthly pay is not supported by automatic payouts — open the row and use Mark as Paid' : undefined}
                        onClick={() => processPayoutMutation.mutate([inv.id])}
                      >
                        {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Pay'}
                      </Button>
                    </TableCell>
                  )}
                  {!isPending && (
                    <TableCell className="text-sm text-muted-foreground">
                      {inv.paid_at ? format(new Date(inv.paid_at), 'MMM d, yyyy') : '—'}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AgentPayoutSheet
        invoice={detail}
        profile={detail?.profile}
        agentName={detail?.agent_name ?? ''}
        onClose={() => setDetailId(null)}
        onProcess={(id) => processPayoutMutation.mutate([id])}
        processing={!!detail && processingIds.has(detail.id)}
      />
    </div>
  );
}
