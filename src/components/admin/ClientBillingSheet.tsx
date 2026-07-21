import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth } from 'date-fns';
import {
  CreditCard, FileText, StickyNote, ExternalLink, Loader2,
} from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type BillingPlan = Tables<'billing_plans'>;

interface ClientBillingSheetProps {
  clientId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NO_PLAN = '__none__';

export function ClientBillingSheet({ clientId, open, onOpenChange }: ClientBillingSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState('');

  const { data: client, isLoading } = useQuery({
    queryKey: ['client-billing-sheet', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id, name, email, phone, company, pipeline_stage, service_type, plan_minutes,
          subscription_started_at,
          current_plan_id, payment_processor, nmi_card_last_four, nmi_card_type,
          payment_method_on_file, billing_plans(id, name, fixed_amount, included_minutes, minute_rate, overage_rate)
        `)
        .eq('id', clientId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: usage } = useQuery({
    queryKey: ['client-billing-usage', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const monthStart = startOfMonth(new Date()).toISOString();
      const { data, error } = await supabase
        .from('call_logs')
        .select('billable_minutes')
        .eq('client_id', clientId!)
        .gte('created_at', monthStart);
      if (error) throw error;
      const minutes = (data ?? []).reduce((sum, r) => sum + (Number(r.billable_minutes) || 0), 0);
      return { minutes };
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['client-billing-invoices', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_summaries')
        .select('id, period_start, period_end, total_minutes, overage_amount, plan_name, payment_status')
        .eq('client_id', clientId!)
        .order('period_start', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['client-billing-notes', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_notes')
        .select('*')
        .eq('lead_id', clientId!)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['billing-plans'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_plans')
        .select('*')
        .eq('is_active', true)
        .order('fixed_amount', { ascending: true, nullsFirst: true });
      if (error) throw error;
      return (data ?? []) as BillingPlan[];
    },
  });

  const changePlanMutation = useMutation({
    mutationFn: async (planId: string | null) => {
      const { error } = await supabase
        .from('leads')
        .update({
          current_plan_id: planId,
          plan_override: true,
          plan_override_by: user?.id ?? null,
          plan_override_at: new Date().toISOString(),
        })
        .eq('id', clientId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-billing-sheet', clientId] });
      queryClient.invalidateQueries({ queryKey: ['active-subscriptions'] });
      toast({ title: 'Plan updated' });
    },
    onError: (err: unknown) => toast({
      title: 'Failed to change plan',
      description: err instanceof Error ? err.message : undefined,
      variant: 'destructive',
    }),
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('billing_notes').insert({
        lead_id: clientId!,
        created_by: user!.id,
        note: noteText.trim(),
        note_type: 'general',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-billing-notes', clientId] });
      toast({ title: 'Note added' });
      setNoteText('');
    },
    onError: () => toast({ title: 'Failed to add note', variant: 'destructive' }),
  });

  const plan = client?.billing_plans as BillingPlan | null | undefined;
  const includedMinutes = plan?.included_minutes ?? client?.plan_minutes ?? null;
  const usageMinutes = usage?.minutes ?? 0;
  const overageMinutes = includedMinutes != null ? Math.max(0, usageMinutes - includedMinutes) : 0;
  const overageRate = plan?.overage_rate ?? plan?.minute_rate ?? null;
  const estimatedAmount =
    (plan?.fixed_amount ?? 0) + (overageMinutes > 0 && overageRate ? overageMinutes * overageRate : 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Client Billing</SheetTitle>
          <SheetDescription>Plan, usage, payment method, and recent invoices.</SheetDescription>
        </SheetHeader>

        {isLoading || !client ? (
          <div className="space-y-3 mt-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* Identity */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-lg">{client.name}</p>
                <p className="text-sm text-muted-foreground">
                  {client.company || client.email}
                </p>
              </div>
              <Badge variant="secondary" className="capitalize">{client.pipeline_stage}</Badge>
            </div>

            {/* Account */}
            <div className="rounded-lg border p-4 space-y-2 text-sm">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Account</Label>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium truncate max-w-[220px]">{client.email}</span>
              </div>
              {client.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium">{client.phone}</span>
                </div>
              )}
              {client.service_type && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium capitalize">{client.service_type.replace(/_/g, ' ')}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Client since</span>
                <span className="font-medium">
                  {client.subscription_started_at
                    ? format(new Date(client.subscription_started_at), 'MMM d, yyyy')
                    : '—'}
                </span>
              </div>
            </div>

            {/* Plan */}
            <div className="rounded-lg border p-4 space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Plan</Label>
              <Select
                value={client.current_plan_id ?? NO_PLAN}
                onValueChange={(v) => changePlanMutation.mutate(v === NO_PLAN ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PLAN}>No plan</SelectItem>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — ${p.fixed_amount}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Current month usage */}
            <div className="rounded-lg border p-4 space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                This Month's Usage
              </Label>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Minutes used</span>
                <span className="font-medium">
                  {usageMinutes.toFixed(0)}
                  {includedMinutes != null && ` / ${includedMinutes}`}
                </span>
              </div>
              {overageMinutes > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overage</span>
                  <span className="font-medium text-destructive">{overageMinutes.toFixed(0)} min</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated amount</span>
                <span className="font-semibold">${estimatedAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div className="rounded-lg border p-4 space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Payment Method
              </Label>
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                {client.payment_method_on_file && client.nmi_card_last_four ? (
                  <span>
                    {client.nmi_card_type ?? 'Card'} •••• {client.nmi_card_last_four}
                  </span>
                ) : (
                  <span className="text-muted-foreground">No payment method on file</span>
                )}
                <Badge variant="outline" className="capitalize ml-auto">
                  {client.payment_processor ?? 'nmi'}
                </Badge>
              </div>
            </div>

            {/* Recent invoices */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Recent Invoices
              </Label>
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invoices yet</p>
              ) : (
                <div className="space-y-2">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between text-sm border rounded-lg p-3">
                      <div>
                        <p className="font-medium">
                          {format(new Date(inv.period_start), 'MMM d')} – {format(new Date(inv.period_end), 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {inv.total_minutes ?? 0} min{inv.plan_name ? ` · ${inv.plan_name}` : ''}
                        </p>
                      </div>
                      <Badge variant={inv.payment_status === 'paid' ? 'default' : 'outline'} className="capitalize">
                        {inv.payment_status ?? 'pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add note */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <StickyNote className="h-3.5 w-3.5" />
                Add Note
              </Label>
              <Textarea
                placeholder="Add a billing note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={2}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!noteText.trim() || addNoteMutation.isPending}
                onClick={() => addNoteMutation.mutate()}
              >
                {addNoteMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                Save Note
              </Button>
              {notes.length > 0 && (
                <div className="space-y-2 pt-1">
                  {notes.map((n) => (
                    <div key={n.id} className="text-xs border rounded p-2">
                      <p className="text-muted-foreground mb-0.5">
                        {format(new Date(n.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                      <p>{n.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* View full profile */}
            <Button variant="outline" className="w-full" asChild>
              <Link to={`/admin/leads/${client.id}`}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View Full Profile
              </Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default ClientBillingSheet;
