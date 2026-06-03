import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWLPartnerLeadMutations, type WLLeadInput } from '@/hooks/wl/useWLPartnerLeadMutations';
import type { WLPartnerLead, WLPipelineStage, WLTemperature } from '@/hooks/wl/useWLPartnerLeads';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: WLPartnerLead | null;
}

const STAGES: WLPipelineStage[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
const TEMPS: WLTemperature[] = ['hot', 'warm', 'cold'];

export function WLLeadFormDialog({ open, onOpenChange, lead }: Props) {
  const { createLead, updateLead } = useWLPartnerLeadMutations();
  const [form, setForm] = useState<WLLeadInput>({
    name: '',
    email: '',
    phone: '',
    company: '',
    pipeline_stage: 'new',
    temperature: null,
    source: '',
    service_interest: '',
    estimated_value: null,
    currency: '',
    notes: '',
  });

  useEffect(() => {
    if (lead) {
      setForm({
        name: lead.name,
        email: lead.email,
        phone: lead.phone ?? '',
        company: lead.company ?? '',
        pipeline_stage: lead.pipeline_stage,
        temperature: lead.temperature,
        source: lead.source ?? '',
        service_interest: lead.service_interest ?? '',
        estimated_value: lead.estimated_value,
        currency: lead.currency ?? '',
        notes: lead.notes ?? '',
      });
    } else {
      setForm({
        name: '', email: '', phone: '', company: '',
        pipeline_stage: 'new', temperature: null,
        source: '', service_interest: '',
        estimated_value: null, currency: '', notes: '',
      });
    }
  }, [lead, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: WLLeadInput = {
      ...form,
      phone: form.phone || null,
      company: form.company || null,
      source: form.source || null,
      service_interest: form.service_interest || null,
      notes: form.notes || null,
      estimated_value: form.estimated_value || null,
      currency: form.currency?.trim() || null,
    };
    if (lead) {
      await updateLead.mutateAsync({ id: lead.id, updates: payload });
    } else {
      await createLead.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const busy = createLead.isPending || updateLead.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? 'Edit Lead' : 'New Lead'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input id="name" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone ?? ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input id="company" value={form.company ?? ''}
                onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="stage">Pipeline Stage</Label>
              <Select value={form.pipeline_stage}
                onValueChange={(v) => setForm({ ...form, pipeline_stage: v as WLPipelineStage })}>
                <SelectTrigger id="stage"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="temp">Temperature</Label>
              <Select value={form.temperature ?? 'none'}
                onValueChange={(v) => setForm({ ...form, temperature: v === 'none' ? null : v as WLTemperature })}>
                <SelectTrigger id="temp"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  {TEMPS.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="source">Source</Label>
              <Input id="source" placeholder="website, referral, etc."
                value={form.source ?? ''}
                onChange={(e) => setForm({ ...form, source: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="service">Service Interest</Label>
              <Input id="service" placeholder="Your service offering"
                value={form.service_interest ?? ''}
                onChange={(e) => setForm({ ...form, service_interest: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="value">Estimated Value</Label>
              <Input id="value" type="number" step="0.01" min="0"
                value={form.estimated_value ?? ''}
                onChange={(e) => setForm({ ...form, estimated_value: e.target.value ? parseFloat(e.target.value) : null })} />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" maxLength={8}
                placeholder="e.g. USD, CAD, EUR"
                value={form.currency ?? ''}
                onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{lead ? 'Save Changes' : 'Create Lead'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
