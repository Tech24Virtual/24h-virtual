import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type BillingPlan = Tables<'billing_plans'>;

const SERVICE_OPTIONS: { value: string; label: string }[] = [
  { value: 'ai-receptionist', label: 'AI Receptionist' },
  { value: 'message-assistant', label: 'Message Assistant' },
  { value: 'virtual-receptionist', label: 'Virtual Receptionist' },
  { value: 'virtual-secretary', label: 'Virtual Secretary' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: BillingPlan | null;
  allPlans: BillingPlan[];
  onSaved: () => void;
}

const ANY_SERVICE = '__any__';
const NO_PLAN = '__none__';

export function BillingPlanEditorDialog({ open, onOpenChange, plan, allPlans, onSaved }: Props) {
  const isEditing = !!plan;
  const [name, setName] = useState('');
  const [planType, setPlanType] = useState<'fixed' | 'per_minute' | 'hybrid'>('fixed');
  const [serviceType, setServiceType] = useState(ANY_SERVICE);
  const [fixedAmount, setFixedAmount] = useState('');
  const [minuteRate, setMinuteRate] = useState('');
  const [includedMinutes, setIncludedMinutes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [autoUpgradeAt, setAutoUpgradeAt] = useState('');
  const [upgradeToPlanId, setUpgradeToPlanId] = useState(NO_PLAN);
  const [autoDowngradeAt, setAutoDowngradeAt] = useState('');
  const [downgradeToPlanId, setDowngradeToPlanId] = useState(NO_PLAN);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(plan?.name ?? '');
    setPlanType((plan?.plan_type as 'fixed' | 'per_minute' | 'hybrid') ?? 'fixed');
    setServiceType(plan?.service_type ?? ANY_SERVICE);
    setFixedAmount(plan?.fixed_amount != null ? String(plan.fixed_amount) : '');
    setMinuteRate(plan?.minute_rate != null ? String(plan.minute_rate) : '');
    setIncludedMinutes(plan?.included_minutes != null ? String(plan.included_minutes) : '');
    setIsActive(plan?.is_active ?? true);
    setAutoUpgradeAt(plan?.auto_upgrade_at_minutes != null ? String(plan.auto_upgrade_at_minutes) : '');
    setUpgradeToPlanId(plan?.upgrade_to_plan_id ?? NO_PLAN);
    setAutoDowngradeAt(plan?.auto_downgrade_at_minutes != null ? String(plan.auto_downgrade_at_minutes) : '');
    setDowngradeToPlanId(plan?.downgrade_to_plan_id ?? NO_PLAN);
  }, [open, plan]);

  // A plan can't chain to itself, and only other plans are valid upgrade/downgrade targets.
  const chainCandidates = allPlans.filter((p) => p.id !== plan?.id);

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Plan name is required');
      return;
    }
    if ((planType === 'fixed' || planType === 'hybrid') && !fixedAmount) {
      toast.error('Fixed amount is required for this plan type');
      return;
    }
    if ((planType === 'per_minute' || planType === 'hybrid') && !minuteRate) {
      toast.error('Minute rate is required for this plan type');
      return;
    }

    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        plan_type: planType,
        service_type: serviceType === ANY_SERVICE ? null : serviceType,
        fixed_amount: fixedAmount ? parseFloat(fixedAmount) : null,
        minute_rate: minuteRate ? parseFloat(minuteRate) : null,
        included_minutes: includedMinutes ? parseInt(includedMinutes, 10) : null,
        is_active: isActive,
        auto_upgrade_at_minutes: autoUpgradeAt ? parseInt(autoUpgradeAt, 10) : null,
        upgrade_to_plan_id: upgradeToPlanId === NO_PLAN ? null : upgradeToPlanId,
        auto_downgrade_at_minutes: autoDowngradeAt ? parseInt(autoDowngradeAt, 10) : null,
        downgrade_to_plan_id: downgradeToPlanId === NO_PLAN ? null : downgradeToPlanId,
      };

      const { error } = isEditing
        ? await supabase.from('billing_plans').update(payload).eq('id', plan.id)
        : await supabase.from('billing_plans').insert(payload);
      if (error) throw error;

      toast.success(isEditing ? 'Plan updated' : 'Plan created');
      onOpenChange(false);
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save plan');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Plan' : 'New Plan'}</DialogTitle>
          <DialogDescription>
            Plans are the catalog clients get assigned to. Set auto-upgrade/downgrade thresholds
            to let the monthly cron move clients between plans automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Plan Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Virtual Receptionist — 250 min" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Plan Type</Label>
              <Select value={planType} onValueChange={(v) => setPlanType(v as typeof planType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="per_minute">Per Minute</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Service</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_SERVICE}>Any Service</SelectItem>
                  {SERVICE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Fixed Amount ($/mo)</Label>
              <Input type="number" min="0" step="0.01" value={fixedAmount} onChange={(e) => setFixedAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Minute Rate ($)</Label>
              <Input type="number" min="0" step="0.01" value={minuteRate} onChange={(e) => setMinuteRate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Included Minutes</Label>
              <Input type="number" min="0" value={includedMinutes} onChange={(e) => setIncludedMinutes(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Active (selectable for clients)</Label>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-sm font-medium">Auto-Upgrade</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>When monthly minutes exceed</Label>
                <Input type="number" min="0" placeholder="e.g. 500" value={autoUpgradeAt} onChange={(e) => setAutoUpgradeAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Upgrade to plan</Label>
                <Select value={upgradeToPlanId} onValueChange={setUpgradeToPlanId}>
                  <SelectTrigger><SelectValue placeholder="No auto-upgrade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PLAN}>None</SelectItem>
                    {chainCandidates.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Auto-Downgrade</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>When monthly minutes fall below</Label>
                <Input type="number" min="0" placeholder="e.g. 100" value={autoDowngradeAt} onChange={(e) => setAutoDowngradeAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Downgrade to plan</Label>
                <Select value={downgradeToPlanId} onValueChange={setDowngradeToPlanId}>
                  <SelectTrigger><SelectValue placeholder="No auto-downgrade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PLAN}>None</SelectItem>
                    {chainCandidates.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handleSave} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isEditing ? 'Save Changes' : 'Create Plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BillingPlanEditorDialog;
