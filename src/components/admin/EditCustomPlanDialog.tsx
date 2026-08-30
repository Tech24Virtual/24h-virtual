import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Settings2, Loader2 } from 'lucide-react';

export interface EditableCustomPlan {
  id: string;
  plan_name: string;
  plan_type: string;
  minute_rate: number | null;
  fixed_amount: number | null;
  minimum_monthly: number | null;
  notes: string | null;
  overage_rate: number | null;
  overage_grace_minutes: number | null;
  overage_cap_amount: number | null;
}

interface EditCustomPlanDialogProps {
  plan: EditableCustomPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PlanType = 'per_minute' | 'fixed' | 'hybrid';

export function EditCustomPlanDialog({ plan, open, onOpenChange }: EditCustomPlanDialogProps) {
  const queryClient = useQueryClient();
  const [planType, setPlanType] = useState<PlanType>('per_minute');
  const [planName, setPlanName] = useState('');
  const [minuteRate, setMinuteRate] = useState('');
  const [fixedAmount, setFixedAmount] = useState('');
  const [minimumMonthly, setMinimumMonthly] = useState('');
  const [notes, setNotes] = useState('');
  const [overageRate, setOverageRate] = useState('');
  const [overageGrace, setOverageGrace] = useState('');
  const [overageCap, setOverageCap] = useState(false);
  const [overageCapAmount, setOverageCapAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Re-populate whenever a new plan is opened for editing
  useEffect(() => {
    if (!plan) return;
    setPlanType((plan.plan_type as PlanType) || 'per_minute');
    setPlanName(plan.plan_name || '');
    setMinuteRate(plan.minute_rate != null ? String(plan.minute_rate) : '');
    setFixedAmount(plan.fixed_amount != null ? String(plan.fixed_amount) : '');
    setMinimumMonthly(plan.minimum_monthly != null ? String(plan.minimum_monthly) : '');
    setNotes(plan.notes || '');
    setOverageRate(plan.overage_rate != null ? String(plan.overage_rate) : '');
    setOverageGrace(plan.overage_grace_minutes != null ? String(plan.overage_grace_minutes) : '');
    setOverageCap(plan.overage_cap_amount != null);
    setOverageCapAmount(plan.overage_cap_amount != null ? String(plan.overage_cap_amount) : '');
  }, [plan]);

  const handleSave = async () => {
    if (!plan) return;
    if (!planName.trim()) {
      toast({ title: 'Please enter a plan name', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('custom_plans')
        .update({
          plan_name: planName.trim(),
          plan_type: planType,
          minute_rate: minuteRate ? Math.round(parseFloat(minuteRate) * 100) / 100 : null,
          fixed_amount: fixedAmount ? Math.round(parseFloat(fixedAmount) * 100) / 100 : null,
          minimum_monthly: minimumMonthly ? Math.round(parseFloat(minimumMonthly) * 100) / 100 : null,
          notes: notes.trim() || null,
          overage_rate: overageRate ? Math.round(parseFloat(overageRate) * 10000) / 10000 : null,
          overage_grace_minutes: overageGrace ? parseInt(overageGrace, 10) : null,
          overage_cap_amount: overageCap && overageCapAmount
            ? Math.round(parseFloat(overageCapAmount) * 100) / 100
            : null,
        })
        .eq('id', plan.id);

      if (error) throw error;

      toast({ title: 'Custom plan updated', description: `${planName} has been saved.` });
      queryClient.invalidateQueries({ queryKey: ['custom-plans'] });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Failed to update custom plan',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Edit Custom Plan
          </DialogTitle>
          <DialogDescription>Update this client's custom pricing arrangement</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Plan Type</Label>
            <RadioGroup value={planType} onValueChange={(v) => setPlanType(v as PlanType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="per_minute" id="edit-per_minute" />
                <Label htmlFor="edit-per_minute" className="font-normal">Per-Minute Only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="edit-fixed" />
                <Label htmlFor="edit-fixed" className="font-normal">Fixed Rate</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hybrid" id="edit-hybrid" />
                <Label htmlFor="edit-hybrid" className="font-normal">Hybrid</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-planName">Plan Name</Label>
            <Input id="edit-planName" value={planName} onChange={(e) => setPlanName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {(planType === 'per_minute' || planType === 'hybrid') && (
              <div className="space-y-2">
                <Label htmlFor="edit-minuteRate">Rate per Minute ($)</Label>
                <Input
                  id="edit-minuteRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={minuteRate}
                  onChange={(e) => setMinuteRate(e.target.value)}
                />
              </div>
            )}
            {(planType === 'fixed' || planType === 'hybrid') && (
              <div className="space-y-2">
                <Label htmlFor="edit-fixedAmount">
                  {planType === 'hybrid' ? 'Base Fee ($)' : 'Monthly Amount ($)'}
                </Label>
                <Input
                  id="edit-fixedAmount"
                  type="number"
                  step="1"
                  min="0"
                  value={fixedAmount}
                  onChange={(e) => setFixedAmount(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium">Overage Pricing</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Overage Rate (per minute)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="pl-7"
                    value={overageRate}
                    onChange={(e) => setOverageRate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Overage Grace Minutes</Label>
                <Input
                  type="number"
                  min="0"
                  value={overageGrace}
                  onChange={(e) => setOverageGrace(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={overageCap} onCheckedChange={setOverageCap} />
              <div>
                <Label>Overage Cap</Label>
                <p className="text-xs text-muted-foreground">Limit maximum overage charge per month</p>
              </div>
            </div>

            {overageCap && (
              <div className="space-y-2">
                <Label>Maximum Overage Charge per Month</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="pl-7"
                    value={overageCapAmount}
                    onChange={(e) => setOverageCapAmount(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {planType === 'per_minute' && (
            <div className="space-y-2">
              <Label htmlFor="edit-minimumMonthly">Minimum Monthly (optional)</Label>
              <Input
                id="edit-minimumMonthly"
                type="number"
                step="1"
                min="0"
                value={minimumMonthly}
                onChange={(e) => setMinimumMonthly(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes (optional)</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !planName.trim()}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
