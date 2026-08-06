import { useState, useEffect } from 'react';
import { Clock, TrendingUp, DollarSign, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { WLPortalLayout } from '@/components/wl-portal/WLPortalLayout';
import { useWLPortal } from '@/contexts/WLPortalContext';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface WLInvoice {
  id: string;
  invoice_number: string | null;
  amount_cents: number | null;
  currency: string | null;
  status: string | null;
  created_at: string;
}

const invoiceStatusColors: Record<string, string> = {
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  draft: 'bg-muted text-muted-foreground',
};

export default function WLPortalBilling() {
  const { clientInfo } = useWLPortal();
  const [usage, setUsage] = useState({ minutesUsed: 0, totalCalls: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState<WLInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);

  useEffect(() => {
    if (!clientInfo) return;
    const fetch = async () => {
      setIsLoading(true);
      const now = new Date();
      const periodStart = startOfMonth(now);
      const periodEnd = endOfMonth(now);

      const { data } = await supabase
        .from('wl_usage_records')
        .select('*')
        .eq('wl_client_id', clientInfo.id)
        .gte('billing_period_start', format(periodStart, 'yyyy-MM-dd'))
        .lte('billing_period_end', format(periodEnd, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const record = data[0];
        setUsage({
          minutesUsed: Number(record.total_minutes_used) || 0,
          totalCalls: record.total_calls || 0,
        });
      }
      setIsLoading(false);
    };
    fetch();
  }, [clientInfo]);

  useEffect(() => {
    if (!clientInfo) return;
    const fetchInvoices = async () => {
      setInvoicesLoading(true);
      const { data } = await (supabase as any)
        .from('wl_invoices')
        .select('id, invoice_number, amount_cents, currency, status, created_at')
        .eq('wl_client_id', clientInfo.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setInvoices((data as WLInvoice[]) || []);
      setInvoicesLoading(false);
    };
    fetchInvoices();
  }, [clientInfo]);

  const currentMonth = format(new Date(), 'MMMM yyyy');

  return (
    <WLPortalLayout title="Usage & Billing" description="View your usage for the current period">
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Minutes Used</p>
                <p className="text-2xl font-bold">{isLoading ? '...' : usage.minutesUsed}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">For {currentMonth}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Calls</p>
                <p className="text-2xl font-bold">{isLoading ? '...' : usage.totalCalls}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">For {currentMonth}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Billing</p>
                <p className="text-lg font-medium text-muted-foreground">Contact your provider</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              For billing inquiries, please reach out to your service provider.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No invoices yet. Contact your provider for billing information.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invoice_number || '-'}</TableCell>
                      <TableCell>{format(new Date(inv.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        {((inv.amount_cents ?? 0) / 100).toFixed(2)} {inv.currency || 'USD'}
                      </TableCell>
                      <TableCell>
                        <Badge className={invoiceStatusColors[inv.status || 'draft']}>
                          {inv.status || 'draft'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </WLPortalLayout>
  );
}
