import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { captureLead } from '@/lib/intake/captureLead';

export interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  service_type: string;
  notes: string;
}

const EMPTY: FormState = {
  name: '', email: '', phone: '', company: '',
  source: '', service_type: '', notes: '',
};

const SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'admin_manual', label: 'Manual (Admin)' },
  { value: 'referral',     label: 'Referral' },
  { value: 'website',      label: 'Website' },
  { value: 'chat_widget',  label: 'Chat Widget' },
  { value: 'cold_outreach',label: 'Cold Outreach' },
  { value: 'partner',      label: 'Partner' },
  { value: 'event',        label: 'Event' },
  { value: 'other',        label: 'Other' },
];

const SERVICE_OPTIONS: { value: string; label: string }[] = [
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'live_chat',    label: 'Live Chat' },
  { value: 'both',         label: 'Both' },
];

export function AddLeadDialog({ open, onOpenChange, onSuccess }: AddLeadDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function reset() {
    setForm(EMPTY);
    setBusy(false);
  }

  function handleOpenChange(next: boolean) {
    if (!busy) {
      if (!next) reset();
      onOpenChange(next);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setBusy(true);
    try {
      const result = await captureLead({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        company: form.company.trim() || null,
        source: (form.source || 'admin_manual') as Parameters<typeof captureLead>[0]['source'],
        service_type: form.service_type || null,
        notes: form.notes.trim() || null,
      });

      if (result.duplicate) {
        toast.warning('Lead already exists for this email');
        onOpenChange(false);
        reset();
        return;
      }

      if (!result.id) {
        throw new Error(result.error ?? 'Failed to create lead');
      }

      toast.success('Lead created');
      onOpenChange(false);
      reset();
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create lead');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Lead</DialogTitle>
          <DialogDescription>Create a new lead and add it to the pipeline.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="al-name">Name *</Label>
              <Input
                id="al-name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Jane Smith"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="al-email">Email *</Label>
              <Input
                id="al-email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="jane@company.com"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="al-phone">Phone</Label>
              <Input
                id="al-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+1 555 000 0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="al-company">Company</Label>
              <Input
                id="al-company"
                value={form.company}
                onChange={(e) => set('company', e.target.value)}
                placeholder="Acme Inc."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select value={form.source} onValueChange={(v) => set('source', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Service Type</Label>
              <Select value={form.service_type} onValueChange={(v) => set('service_type', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="al-notes">Notes</Label>
            <Textarea
              id="al-notes"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Any additional context..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !form.name.trim() || !form.email.trim()}>
              {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : 'Create Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
