import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, DollarSign, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AgentPayoutsListProps {
  statusFilter: 'supervisor_approved' | 'paid';
}

interface InvoiceWithBanking {
  id: string;
  agent_id: string;
  period_start: string;
  period_end: string;
  net_hours: number;
  total_hours: number;
  total_break_minutes: number;
  status: string;
  submitted_at: string;
  payout_amount: number | null;
  airwallex_transfer_id: string | null;
  paid_at: string | null;
  agent_name: string | null;
  hourly_rate: number | null;
  has_banking: boolean;
}

export function AgentPayoutsList({ statusFilter }: AgentPayoutsListProps) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['payout-invoices', statusFilter],
    queryFn: async () => {
      const { data: invoiceData, error } = await supabase
        .from('shift_invoices')
        .select('*')
        .eq('status', statusFilter)
        .order('period_start', { ascending: false });
      if (error) throw error;

      if (!invoiceData?.length) return [];

      // Get unique agent IDs
      const agentIds = [...new Set(invoiceData.map(i => i.agent_id))];

      // Fetch banking + profiles in parallel
      const [bankingResult, profilesResult] = await Promise.all([
        supabase.from('agent_banking').select('agent_id, hourly_rate').in('agent_id', agentIds),
        supabase.from('profiles').select('id, full_name').in('id', agentIds),
      ]);

      const bankingMap = new Map((bankingResult.data || []).map(b => [b.agent_id, b]));
      const profileMap = new Map((profilesResult.data || []).map(p => [p.id, p]));

      return invoiceData.map(inv => ({
        ...inv,
        agent_name: profileMap.get(inv.agent_id)?.full_name || inv.agent_id.slice(0, 8),
        hourly_rate: bankingMap.get(inv.agent_id)?.hourly_rate || null,
        has_banking: bankingMap.has(inv.agent_id),
      })) as InvoiceWithBanking[];
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
      setSelectedIds(new Set());
      setProcessingIds(new Set());

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

  const toggleAll = () => {
    if (selectedIds.size === invoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(invoices.map(i => i.id)));
    }
  };

  const calcAmount = (inv: InvoiceWithBanking) => {
    if (inv.payout_amount) return inv.payout_amount;
    if (!inv.hourly_rate) return null;
    return Math.round(inv.net_hours * inv.hourly_rate * 100) / 100;
  };

  const isPending = statusFilter === 'supervisor_approved';

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
                    checked={selectedIds.size === invoices.length && invoices.length > 0}
                    onCheckedChange={toggleAll}
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
              const amount = calcAmount(inv);
              const isProcessing = processingIds.has(inv.id);

              return (
                <TableRow key={inv.id}>
                  {isPending && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(inv.id)}
                        onCheckedChange={() => toggleSelect(inv.id)}
                        disabled={!inv.has_banking || !inv.hourly_rate}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{inv.agent_name}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(inv.period_start), 'MMM d')} – {format(new Date(inv.period_end), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">{inv.net_hours.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    {inv.hourly_rate ? `$${inv.hourly_rate.toFixed(2)}` : <span className="text-destructive text-xs">Not set</span>}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {amount ? `$${amount.toFixed(2)}` : '—'}
                  </TableCell>
                  <TableCell>
                    {inv.has_banking ? (
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
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!inv.has_banking || !inv.hourly_rate || isProcessing}
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
    </div>
  );
}
