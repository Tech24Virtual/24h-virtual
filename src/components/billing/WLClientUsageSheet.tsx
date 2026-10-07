import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatMoney } from '@/lib/billing/pricing';

interface WLClientUsageSheetProps {
  client: { id: string; client_name: string; service_type?: string | null } | null;
  partnerName?: string | null;
  onClose: () => void;
}

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-lg border p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-lg font-semibold mt-0.5">{value}</p>
  </div>
);

const fmtDate = (d: string) => format(new Date(`${d}T00:00:00`), 'MMM d, yyyy');

export function WLClientUsageSheet({ client, partnerName, onClose }: WLClientUsageSheetProps) {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['billing-wl-client-usage', client?.id],
    enabled: !!client,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wl_usage_records')
        .select('*')
        .eq('wl_client_id', client!.id)
        .order('billing_period_start', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const totals = records.reduce(
    (acc, r) => ({
      calls: acc.calls + (r.total_calls ?? 0),
      minutes: acc.minutes + Number(r.total_minutes_used ?? 0),
      wholesale: acc.wholesale + Number(r.wholesale_cost ?? 0),
      retail: acc.retail + Number(r.partner_retail_revenue ?? 0),
    }),
    { calls: 0, minutes: 0, wholesale: 0, retail: 0 },
  );

  return (
    <Sheet open={!!client} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{client?.client_name}</SheetTitle>
          <SheetDescription>
            {[partnerName, client?.service_type].filter(Boolean).join(' · ') || 'WL client usage'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : records.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No usage records for this client yet.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Total calls" value={totals.calls.toLocaleString()} />
                <Stat label="Total minutes" value={totals.minutes.toLocaleString(undefined, { maximumFractionDigits: 1 })} />
                <Stat label="Wholesale cost" value={formatMoney(totals.wholesale)} />
                <Stat label="Retail revenue" value={formatMoney(totals.retail)} />
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Billing periods</h3>
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Calls</TableHead>
                        <TableHead className="text-right">Min</TableHead>
                        <TableHead className="text-right">Wholesale</TableHead>
                        <TableHead className="text-right">Retail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {fmtDate(r.billing_period_start)} – {fmtDate(r.billing_period_end)}
                            <div className="text-[11px] text-muted-foreground">
                              {r.effective_rate != null ? `${formatMoney(Number(r.effective_rate))}/min effective` : ''}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm">{r.total_calls ?? 0}</TableCell>
                          <TableCell className="text-right text-sm">{Number(r.total_minutes_used ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                          <TableCell className="text-right text-sm">{formatMoney(Number(r.wholesale_cost ?? 0))}</TableCell>
                          <TableCell className="text-right text-sm">{formatMoney(Number(r.partner_retail_revenue ?? 0))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
