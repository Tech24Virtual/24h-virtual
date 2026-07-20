import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowRight, Plus, Settings2, TrendingDown, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BillingPlanEditorDialog } from '@/components/admin/BillingPlanEditorDialog';
import type { Tables } from '@/integrations/supabase/types';

type BillingPlan = Tables<'billing_plans'>;

const SERVICE_LABELS: Record<string, string> = {
  'ai-receptionist': 'AI Receptionist',
  'message-assistant': 'Message Assistant',
  'virtual-receptionist': 'Virtual Receptionist',
  'virtual-secretary': 'Virtual Secretary',
};

function formatMoney(n: number | null): string {
  return n != null ? `$${n.toFixed(2)}` : '—';
}

export function BillingPlanCatalog() {
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<BillingPlan | null>(null);

  const { data: plans = [], isLoading, error } = useQuery({
    queryKey: ['billing-plans'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_plans')
        .select('*')
        .order('fixed_amount', { ascending: true, nullsFirst: true });
      if (error) throw error;
      return (data ?? []) as BillingPlan[];
    },
  });

  const planById = new Map(plans.map((p) => [p.id, p]));

  function openCreate() {
    setEditingPlan(null);
    setEditorOpen(true);
  }

  function openEdit(plan: BillingPlan) {
    setEditingPlan(plan);
    setEditorOpen(true);
  }

  function handleSaved() {
    queryClient.invalidateQueries({ queryKey: ['billing-plans'] });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Plan Catalog</CardTitle>
          <CardDescription>
            Plans clients get assigned to. Set thresholds so the monthly cron can auto-adjust.
          </CardDescription>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          New Plan
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive/80">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-60" />
            <p className="font-medium">Failed to load plans</p>
            <p className="text-xs text-muted-foreground mt-1">
              Verify <code className="font-mono">GRANT SELECT ON public.billing_plans</code> is applied.
            </p>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No plans configured yet</p>
            <Button variant="outline" className="mt-4" onClick={openCreate}>
              Create First Plan
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-start justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
                onClick={() => openEdit(plan)}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{plan.name}</span>
                    <Badge variant={plan.is_active ? 'default' : 'outline'}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="secondary" className="capitalize">{plan.plan_type}</Badge>
                    {plan.service_type && (
                      <Badge variant="outline">{SERVICE_LABELS[plan.service_type] || plan.service_type}</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {formatMoney(plan.fixed_amount)}/mo
                    {plan.minute_rate != null && ` · ${formatMoney(plan.minute_rate)}/min`}
                    {plan.included_minutes != null && ` · ${plan.included_minutes} min included`}
                  </div>
                  {(plan.auto_upgrade_at_minutes != null || plan.auto_downgrade_at_minutes != null) && (
                    <div className="flex flex-col gap-1 mt-2 text-xs text-muted-foreground">
                      {plan.auto_upgrade_at_minutes != null && (
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="h-3 w-3 text-green-600" />
                          <span>
                            Upgrades at {plan.auto_upgrade_at_minutes} min
                            {plan.upgrade_to_plan_id && (
                              <>
                                {' '}<ArrowRight className="h-3 w-3 inline" />{' '}
                                {planById.get(plan.upgrade_to_plan_id)?.name || 'Unknown plan'}
                              </>
                            )}
                          </span>
                        </div>
                      )}
                      {plan.auto_downgrade_at_minutes != null && (
                        <div className="flex items-center gap-1.5">
                          <TrendingDown className="h-3 w-3 text-yellow-600" />
                          <span>
                            Downgrades below {plan.auto_downgrade_at_minutes} min
                            {plan.downgrade_to_plan_id && (
                              <>
                                {' '}<ArrowRight className="h-3 w-3 inline" />{' '}
                                {planById.get(plan.downgrade_to_plan_id)?.name || 'Unknown plan'}
                              </>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <BillingPlanEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        plan={editingPlan}
        allPlans={plans}
        onSaved={handleSaved}
      />
    </Card>
  );
}

export default BillingPlanCatalog;
