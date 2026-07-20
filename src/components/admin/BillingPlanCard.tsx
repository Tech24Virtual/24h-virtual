import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

type BillingPlan = Tables<'billing_plans'>;

interface Props {
  leadId: string;
  currentPlanId: string | null;
  planOverride: boolean;
  planLastAutoChangedAt: string | null;
  onUpdate: () => void;
}

const NO_PLAN = '__none__';

/**
 * Catalog-driven billing plan assignment. Separate from the read-only
 * "Selected Plan" card above it, which shows what the client picked during
 * the signup wizard (service_type/plan_minutes) — this governs what
 * billing_plans row actually drives their monthly auto-adjustment.
 */
export function BillingPlanCard({ leadId, currentPlanId, planOverride, planLastAutoChangedAt, onUpdate }: Props) {
  const { user } = useAuth();
  const [selectedPlanId, setSelectedPlanId] = useState(currentPlanId ?? NO_PLAN);
  const [override, setOverride] = useState(planOverride);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSelectedPlanId(currentPlanId ?? NO_PLAN);
    setOverride(planOverride);
  }, [currentPlanId, planOverride]);

  // Include the currently-assigned plan even if it's since been deactivated,
  // so the selector doesn't silently drop what the client is actually on.
  const { data: plans = [], isLoading } = useQuery({
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

  const selectablePlans = plans.filter((p) => p.is_active || p.id === currentPlanId);
  const dirty = selectedPlanId !== (currentPlanId ?? NO_PLAN) || override !== planOverride;

  async function handleSave() {
    setBusy(true);
    try {
      const nextPlanId = selectedPlanId === NO_PLAN ? null : selectedPlanId;
      const { error } = await supabase
        .from('leads')
        .update({
          current_plan_id: nextPlanId,
          plan_override: override,
          plan_override_by: override ? (user?.id ?? null) : null,
          plan_override_at: override ? new Date().toISOString() : null,
        })
        .eq('id', leadId);
      if (error) throw error;

      toast.success('Billing plan saved');
      onUpdate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save billing plan');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Billing Plan
        </CardTitle>
        <CardDescription>
          Plans adjust automatically based on monthly usage. Lock to override.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedPlanId} onValueChange={setSelectedPlanId} disabled={isLoading || busy}>
          <SelectTrigger>
            <SelectValue placeholder="Select a plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_PLAN}>No plan assigned</SelectItem>
            {selectablePlans.map((plan) => (
              <SelectItem key={plan.id} value={plan.id}>
                {plan.name}
                {plan.fixed_amount != null && ` — $${plan.fixed_amount.toFixed(2)}/mo`}
                {plan.included_minutes ? ` (${plan.included_minutes} min included)` : ''}
                {!plan.is_active && ' (inactive)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch checked={override} onCheckedChange={setOverride} disabled={busy} />
          <Label>Lock plan (prevent auto-adjustment)</Label>
        </div>

        {planLastAutoChangedAt && (
          <p className="text-xs text-muted-foreground">
            Last auto-adjusted: {format(new Date(planLastAutoChangedAt), 'MMM d, yyyy')}
          </p>
        )}

        <Button className="w-full" onClick={handleSave} disabled={busy || !dirty}>
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Save Plan
        </Button>
      </CardContent>
    </Card>
  );
}

export default BillingPlanCard;
