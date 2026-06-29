import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, PhoneOutgoing } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateOutboundRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  contactName: string;
  contactPhone: string;
  leadId: string;
  reason: string;
  priority: 'normal' | 'urgent';
}

const EMPTY: FormState = {
  contactName: '',
  contactPhone: '',
  leadId: '',
  reason: '',
  priority: 'normal',
};

export function CreateOutboundRequestDialog({ open, onOpenChange }: CreateOutboundRequestDialogProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleOpenChange(next: boolean) {
    if (busy) return;
    if (!next) setForm(EMPTY);
    onOpenChange(next);
  }

  // Active clients for the Client select
  const { data: activeLeads = [] } = useQuery({
    queryKey: ['admin-active-leads-for-outbound'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, company')
        .eq('pipeline_stage', 'active')
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.contactName.trim();
    const phone = form.contactPhone.trim();
    if (!name || !phone) return;

    setBusy(true);
    try {
      const { error } = await supabase.from('outbound_call_requests').insert({
        contact_name: name,
        contact_phone: phone,
        lead_id: form.leadId || null,
        reason: form.reason.trim() || null,
        urgency: form.priority,
        source: 'admin',
        source_channel: 'admin_portal',
      });
      if (error) throw error;

      toast.success('Outbound request created');
      queryClient.invalidateQueries({ queryKey: ['outbound-requests'] });
      queryClient.invalidateQueries({ queryKey: ['outbound-stats'] });
      handleOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create request');
    } finally {
      setBusy(false);
    }
  }

  const isValid = form.contactName.trim().length >= 2 && form.contactPhone.trim().length >= 7;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneOutgoing className="h-5 w-5 text-primary" />
            Create Outbound Request
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cor-name">Contact Name *</Label>
              <Input
                id="cor-name"
                value={form.contactName}
                onChange={(e) => set('contactName', e.target.value)}
                placeholder="Jane Smith"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cor-phone">Contact Phone *</Label>
              <Input
                id="cor-phone"
                type="tel"
                value={form.contactPhone}
                onChange={(e) => set('contactPhone', e.target.value)}
                placeholder="+1 555 000 0000"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Client (Active Account)</Label>
            <Select value={form.leadId} onValueChange={(v) => set('leadId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select client — optional" />
              </SelectTrigger>
              <SelectContent>
                {activeLeads.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}{l.company ? ` — ${l.company}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cor-reason">Reason / Notes</Label>
            <Textarea
              id="cor-reason"
              value={form.reason}
              onChange={(e) => set('reason', e.target.value)}
              placeholder="Reason for the call, context for the agent…"
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select
              value={form.priority}
              onValueChange={(v) => set('priority', v as 'normal' | 'urgent')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !isValid}>
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create Request'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
