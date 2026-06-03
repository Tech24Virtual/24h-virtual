import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Settings2, Loader2 } from 'lucide-react';

interface CustomPlanBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedLeadId?: string;
}

type PlanType = 'per_minute' | 'fixed' | 'hybrid';

export function CustomPlanBuilder({ open, onOpenChange, preselectedLeadId }: CustomPlanBuilderProps) {
  const [leadId, setLeadId] = useState(preselectedLeadId || '');
  const [planType, setPlanType] = useState<PlanType>('per_minute');
  const [planName, setPlanName] = useState('');
  const [minuteRate, setMinuteRate] = useState('');
  const [fixedAmount, setFixedAmount] = useState('');
  const [minimumMonthly, setMinimumMonthly] = useState('');
  const [notes, setNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const queryClient = useQueryClient();

  // Fetch leads
  const { data: leads } = useQuery({
    queryKey: ['leads-for-custom-plan'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, company')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleCreate = async () => {
    if (!leadId) {
      toast({ title: 'Please select a client', variant: 'destructive' });
      return;
    }
    if (!planName.trim()) {
      toast({ title: 'Please enter a plan name', variant: 'destructive' });
      return;
    }
    if (planType === 'per_minute' && !minuteRate) {
      toast({ title: 'Please enter a minute rate', variant: 'destructive' });
      return;
    }
    if (planType === 'fixed' && !fixedAmount) {
      toast({ title: 'Please enter a fixed amount', variant: 'destructive' });
      return;
    }
    if (planType === 'hybrid' && (!minuteRate || !fixedAmount)) {
      toast({ title: 'Please enter both minute rate and fixed amount', variant: 'destructive' });
      return;
    }

    setIsCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-custom-plan', {
        body: {
          leadId,
          planType,
          planName: planName.trim(),
          minuteRate: minuteRate ? parseFloat(minuteRate) : undefined,
          fixedAmount: fixedAmount ? parseFloat(fixedAmount) : undefined,
          minimumMonthly: minimumMonthly ? parseFloat(minimumMonthly) : undefined,
          notes: notes.trim() || undefined,
        },
      });

      if (error) throw error;

      toast({ 
        title: 'Custom plan created!',
        description: `${planName} has been created and is ready to use`,
      });

      queryClient.invalidateQueries({ queryKey: ['custom-plans'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Create error:', error);
      toast({ 
        title: 'Failed to create custom plan', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setLeadId(preselectedLeadId || '');
    setPlanType('per_minute');
    setPlanName('');
    setMinuteRate('');
    setFixedAmount('');
    setMinimumMonthly('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Create Custom Plan
          </DialogTitle>
          <DialogDescription>
            Create a custom pricing arrangement for a specific client
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label>Client</Label>
            <Select value={leadId} onValueChange={setLeadId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {leads?.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.name} {lead.company && `(${lead.company})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Plan Type */}
          <div className="space-y-2">
            <Label>Plan Type</Label>
            <RadioGroup value={planType} onValueChange={(v) => setPlanType(v as PlanType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="per_minute" id="per_minute" />
                <Label htmlFor="per_minute" className="font-normal">
                  Per-Minute Only
                  <span className="text-xs text-muted-foreground ml-2">
                    Bill based on actual usage
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="fixed" />
                <Label htmlFor="fixed" className="font-normal">
                  Fixed Rate
                  <span className="text-xs text-muted-foreground ml-2">
                    Set monthly amount
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hybrid" id="hybrid" />
                <Label htmlFor="hybrid" className="font-normal">
                  Hybrid
                  <span className="text-xs text-muted-foreground ml-2">
                    Base fee + per-minute
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Plan Name */}
          <div className="space-y-2">
            <Label htmlFor="planName">Plan Name</Label>
            <Input
              id="planName"
              placeholder="e.g., Premium Custom Plan"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
            />
          </div>

          {/* Pricing Fields */}
          <div className="grid grid-cols-2 gap-4">
            {(planType === 'per_minute' || planType === 'hybrid') && (
              <div className="space-y-2">
                <Label htmlFor="minuteRate">Rate per Minute ($)</Label>
                <Input
                  id="minuteRate"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="1.50"
                  value={minuteRate}
                  onChange={(e) => setMinuteRate(e.target.value)}
                />
              </div>
            )}
            
            {(planType === 'fixed' || planType === 'hybrid') && (
              <div className="space-y-2">
                <Label htmlFor="fixedAmount">
                  {planType === 'hybrid' ? 'Base Fee ($)' : 'Monthly Amount ($)'}
                </Label>
                <Input
                  id="fixedAmount"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="500"
                  value={fixedAmount}
                  onChange={(e) => setFixedAmount(e.target.value)}
                />
              </div>
            )}
          </div>

          {planType === 'per_minute' && (
            <div className="space-y-2">
              <Label htmlFor="minimumMonthly">Minimum Monthly (optional)</Label>
              <Input
                id="minimumMonthly"
                type="number"
                step="1"
                min="0"
                placeholder="100"
                value={minimumMonthly}
                onChange={(e) => setMinimumMonthly(e.target.value)}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Special rate negotiated for long-term contract..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Preview */}
          {planName && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="font-medium">{planName}</div>
              <div className="text-muted-foreground">
                {planType === 'per_minute' && minuteRate && `$${minuteRate}/minute`}
                {planType === 'fixed' && fixedAmount && `$${fixedAmount}/month`}
                {planType === 'hybrid' && fixedAmount && minuteRate && 
                  `$${fixedAmount}/month base + $${minuteRate}/minute`}
                {minimumMonthly && ` (min $${minimumMonthly}/mo)`}
              </div>
            </div>
          )}

          <Button 
            onClick={handleCreate} 
            disabled={isCreating || !leadId || !planName}
            className="w-full"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              'Create Custom Plan'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
