import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { AlertTriangle, CreditCard, ExternalLink, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatMoney, projectInvoice, resolvePlanTerms } from '@/lib/billing/pricing';

type Lead = Tables<'leads'>;

interface UsageResult {
  calls: number;
  minutes: number;
}

const Stat = ({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) => (
  <div className="rounded-lg border p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-xl font-semibold mt-0.5">{value}</p>
    {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
  </div>
);

export function ClientBillingDetail({ lead }: { lead: Lead }) {
  const currency = (lead.billing_currency || 'USD').toUpperCase();
  const money = (n: number | null | undefined) => formatMoney(n, currency);

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const monthLabel = format(monthStart, 'MMMM yyyy');

  const { data: catalogPlan } = useQuery({
    queryKey: ['billing-lead-plan', lead.current_plan_id],
    enabled: !!lead.current_plan_id,
    queryFn: async () => {
      const { data, error } = await supabase.from('billing_plans').select('*').eq('id', lead.current_plan_id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: customPlan } = useQuery({
    queryKey: ['billing-lead-custom-plan', lead.id],
    enabled: !!lead.custom_plan_enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_plans').select('*').eq('lead_id', lead.id).eq('is_active', true)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['billing-client-usage', lead.id, format(monthStart, 'yyyy-MM')],
    queryFn: async (): Promise<UsageResult> => {
      const { data, error } = await supabase.rpc('billing_client_usage', {
        p_client_id: lead.id,
        p_from: format(monthStart, 'yyyy-MM-dd'),
        p_to: format(monthEnd, 'yyyy-MM-dd'),
      });
      if (error) throw error;
      const r = (data ?? {}) as { calls?: number; minutes?: number };
      return { calls: Number(r.calls ?? 0), minutes: Number(r.minutes ?? 0) };
    },
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['billing-client-invoices', lead.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_summaries').select('*').eq('client_id', lead.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: failures = [] } = useQuery({
    queryKey: ['billing-client-failures', lead.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_failures').select('*').eq('lead_id', lead.id).order('failed_at', { ascending: false }).limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const terms = useMemo(() => resolvePlanTerms(lead, catalogPlan, customPlan), [lead, catalogPlan, customPlan]);
  const projection = useMemo(() => projectInvoice(lead, terms, usage?.minutes ?? 0), [lead, terms, usage?.minutes]);

  return (
    <div className="space-y-4">
      {/* Projected next invoice */}
      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" /> Projected Next Invoice
          </CardTitle>
          <CardDescription>
            Based on {monthLabel} usage to date, using the same rules as the billing run. The run bills overage only; the
            base plan is charged separately through {lead.payment_processor === 'nmi' ? 'NMI' : 'Stripe'}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usageLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat
                label="Base plan"
                value={money(projection.baseAmount)}
                hint={terms.planName ? `${terms.planName}${terms.source === 'custom' ? ' (custom)' : ''}` : 'No plan on file'}
              />
              <Stat
                label="Overage so far"
                value={money(projection.overageAmount)}
                hint={`${projection.overageMinutes} min × ${money(projection.overageRate)}`}
              />
              <Stat label="Projected total" value={money(projection.total)} />
              <Stat label="Minutes used" value={projection.minutesUsed.toLocaleString()} hint={`of ${projection.includedMinutes} included`} />
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoice History</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="payment">Payment Info</TabsTrigger>
        </TabsList>

        {/* Invoice history */}
        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {invoicesLoading ? (
                <div className="p-4"><Skeleton className="h-20 w-full" /></div>
              ) : invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">No invoices yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Minutes</TableHead>
                      <TableHead className="text-right">Overage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Transaction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {format(new Date(inv.created_at), 'MMM d, yyyy')}
                          <div className="text-[11px] text-muted-foreground">
                            {format(new Date(inv.period_start), 'MMM d')} – {format(new Date(inv.period_end), 'MMM d')}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{inv.plan_name || '—'}</TableCell>
                        <TableCell className="text-right text-sm">
                          {inv.total_minutes ?? 0}
                          <div className="text-[11px] text-muted-foreground">{inv.included_minutes ?? 0} incl.</div>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {money(inv.overage_amount)}
                          <div className="text-[11px] text-muted-foreground">{inv.overage_minutes ?? 0} min</div>
                        </TableCell>
                        <TableCell><StatusBadge status={inv.payment_status || 'pending'} /></TableCell>
                        <TableCell className="text-xs">
                          {inv.stripe_invoice_url ? (
                            <a href={inv.stripe_invoice_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                              {inv.stripe_invoice_id ?? 'Stripe invoice'} <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="font-mono text-muted-foreground">
                              {inv.nmi_transaction_id ?? inv.stripe_invoice_id ?? '—'}
                            </span>
                          )}
                          {inv.payment_processor && <div className="text-[11px] text-muted-foreground uppercase">{inv.payment_processor}</div>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage */}
        <TabsContent value="usage" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{monthLabel}</CardTitle>
              <CardDescription>Month to date</CardDescription>
            </CardHeader>
            <CardContent>
              {usageLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Stat label="Calls" value={(usage?.calls ?? 0).toLocaleString()} />
                  <Stat label="Minutes used" value={projection.minutesUsed.toLocaleString()} />
                  <Stat label="Included minutes" value={projection.includedMinutes.toLocaleString()} />
                  <Stat label="Overage minutes" value={projection.overageMinutes.toLocaleString()} />
                  <Stat label="Overage amount" value={money(projection.overageAmount)} />
                </div>
              )}
              {!lead.plan_minutes && (
                <p className="text-xs text-muted-foreground mt-3">
                  This client has no included minutes set on their record, so the billing run treats every minute as overage.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment info */}
        <TabsContent value="payment" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-4 w-4" /> Card &amp; payment status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Stat
                  label="Payment method"
                  value={lead.payment_method_on_file ? 'On file' : 'None'}
                  hint={lead.payment_processor ? `Processor: ${lead.payment_processor.toUpperCase()}` : undefined}
                />
                <Stat
                  label="Card"
                  value={lead.nmi_card_last_four ? `•••• ${lead.nmi_card_last_four}` : '—'}
                  hint={[lead.nmi_card_type, lead.nmi_card_expiry && `exp ${lead.nmi_card_expiry}`].filter(Boolean).join(' · ') || undefined}
                />
                <Stat
                  label="Last payment"
                  value={lead.last_payment_status ? <StatusBadge status={lead.last_payment_status} /> : '—'}
                  hint={lead.last_payment_date ? format(new Date(lead.last_payment_date), 'MMM d, yyyy') : undefined}
                />
                <Stat
                  label="Failures on record"
                  value={failures.length}
                  hint={failures.length ? `${failures.filter((f) => !f.resolved_at).length} unresolved` : undefined}
                />
              </div>
              {(lead.stripe_subscription_id || lead.nmi_subscription_id) && (
                <p className="mt-3 flex items-center gap-2 text-sm font-medium">
                  <CreditCard className="h-4 w-4 text-primary" /> Active subscription
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-destructive" /> Payment failures
              </CardTitle>
            </CardHeader>
            <CardContent>
              {failures.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payment failures</p>
              ) : (
                <div className="space-y-2">
                  {failures.map((f) => (
                    <div key={f.id} className="flex items-start justify-between gap-3 text-sm border-b pb-2 last:border-0">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="destructive" className="text-xs">{f.failure_code || 'unknown'}</Badge>
                          <span className="text-muted-foreground">{format(new Date(f.failed_at), 'MMM d, yyyy')}</span>
                          {f.amount != null && <span className="font-medium">{money(f.amount)}</span>}
                          {f.card_last4 && <span className="text-xs text-muted-foreground">•••• {f.card_last4}</span>}
                        </div>
                        {(f.failure_message || f.error_message) && (
                          <p className="text-xs text-muted-foreground">{f.failure_message || f.error_message}</p>
                        )}
                        {!f.resolved_at && f.next_retry_at && !f.retry_cancelled && (
                          <p className="text-xs text-muted-foreground">Next retry {format(new Date(f.next_retry_at), 'MMM d, h:mm a')}</p>
                        )}
                      </div>
                      {f.resolved_at ? <Badge variant="secondary">Resolved</Badge> : <Badge variant="outline">Open</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
