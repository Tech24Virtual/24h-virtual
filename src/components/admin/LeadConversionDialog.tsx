import { useState } from 'react';
import { UserCheck, Loader2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isHandoffEligible, isTerminalStage, PIPELINE_STAGE_LABELS } from '@/lib/revenue/pipeline';
import { convertLeadToDelivery } from '@/lib/governance/revenueOverview';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  service_type?: string | null;
  plan_minutes?: number | null;
  billing_period?: string | null;
  billing_currency?: string | null;
  pipeline_stage?: string | null;
}

interface Props {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConverted: () => void;
}

export function LeadConversionDialog({ lead, open, onOpenChange, onConverted }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConverting, setIsConverting] = useState(false);
  const [form, setForm] = useState({
    name: lead.name,
    email: lead.email,
    phone: lead.phone || '',
    company: lead.company || '',
    service_type: lead.service_type || '',
    plan_minutes: lead.plan_minutes?.toString() || '',
    billing_period: lead.billing_period || 'monthly',
    billing_currency: lead.billing_currency || 'usd',
    notes: '',
  });

  const stage = lead.pipeline_stage ?? 'new';
  const terminal = isTerminalStage(stage);
  const eligible = isHandoffEligible(stage);

  const handleConvert = async () => {
    if (!form.name || !form.email) {
      toast({ title: 'Missing fields', description: 'Name and email are required.', variant: 'destructive' });
      return;
    }
    if (terminal) {
      toast({ title: 'Lead is closed', description: `Cannot convert a ${PIPELINE_STAGE_LABELS[stage as never] ?? stage} lead.`, variant: 'destructive' });
      return;
    }

    setIsConverting(true);
    try {
      const { error: leadError } = await supabase
        .from('leads')
        .update({
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          company: form.company || null,
          service_type: form.service_type || null,
          plan_minutes: form.plan_minutes ? parseInt(form.plan_minutes) : null,
          billing_period: form.billing_period,
          billing_currency: form.billing_currency,
        })
        .eq('id', lead.id);
      if (leadError) throw leadError;

      // Phase 3 — canonical Revenue→Delivery handoff (idempotent server-side).
      const result = await convertLeadToDelivery(lead.id, form.notes || null);

      toast({
        title: result.idempotent ? 'Already converted' : 'Lead converted!',
        description: result.idempotent
          ? `This lead was previously handed off (intake ${result.intake_number ?? '—'}).`
          : `${form.name} has been handed off to Delivery (intake ${result.intake_number}).`,
      });
      onOpenChange(false);
      onConverted();
    } catch (err: any) {
      toast({ title: 'Conversion failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Convert Lead to Client
          </DialogTitle>
          <DialogDescription>
            Review and confirm the client details before conversion. This creates a Delivery intake atomically.
          </DialogDescription>
        </DialogHeader>

        {!eligible && !terminal && (
          <div className="flex items-start gap-2 rounded-md border border-yellow-300/40 bg-yellow-50/50 dark:bg-yellow-950/20 p-3 text-xs">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <span>
              Lead stage is <b>{PIPELINE_STAGE_LABELS[stage as never] ?? stage}</b>. Best practice is to qualify or
              send a proposal before handing off to Delivery — but conversion is allowed.
            </span>
          </div>
        )}
        {terminal && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <span>This lead is closed ({PIPELINE_STAGE_LABELS[stage as never] ?? stage}). Conversion is blocked.</span>
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Service Type</Label>
              <Select value={form.service_type} onValueChange={(v) => setForm({ ...form, service_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai-receptionist">AI Receptionist</SelectItem>
                  <SelectItem value="message-assistant">Message Assistant</SelectItem>
                  <SelectItem value="virtual-receptionist">Virtual Receptionist</SelectItem>
                  <SelectItem value="virtual-secretary">Virtual Secretary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Plan Minutes</Label>
              <Input type="number" value={form.plan_minutes} onChange={(e) => setForm({ ...form, plan_minutes: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Billing Period</Label>
              <Select value={form.billing_period} onValueChange={(v) => setForm({ ...form, billing_period: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={form.billing_currency} onValueChange={(v) => setForm({ ...form, billing_currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="usd">USD</SelectItem>
                  <SelectItem value="cad">CAD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Account Notes</Label>
            <Textarea
              placeholder="Any onboarding context or notes..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConverting}>Cancel</Button>
          <Button onClick={handleConvert} disabled={isConverting || terminal}>
            {isConverting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserCheck className="w-4 h-4 mr-2" />}
            Confirm Conversion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
