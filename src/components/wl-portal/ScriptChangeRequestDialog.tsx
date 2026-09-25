import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const CHANGE_TYPES = [
  { value: 'add_information', label: 'Add Information' },
  { value: 'remove_information', label: 'Remove Information' },
  { value: 'update_wording', label: 'Update Wording' },
  { value: 'other', label: 'Other' },
];

export function changeTypeLabel(value: string | null): string {
  return CHANGE_TYPES.find(t => t.value === value)?.label ?? 'Other';
}

interface WLScript {
  id: string;
  title: string;
}

interface Props {
  open: boolean;
  onClose: (submitted: boolean) => void;
  script: WLScript | null;
  wlClientId: string;
  partnerId: string | null;
  clientName: string;
}

/**
 * WL end-client change request dialog. script_change_requests.script_id is a
 * real FK to client_scripts (the direct-client table) — WL scripts live in a
 * separate wl_client_scripts table, so the target script is carried inside
 * proposed_changes instead of script_id, matching the pattern already used by
 * WLPortalAdminCampaignDetail.tsx's "Request edit from 24H".
 */
export function WLScriptChangeRequestDialog({ open, onClose, script, wlClientId, partnerId, clientName }: Props) {
  const { user } = useAuth();
  const [changeType, setChangeType] = useState('add_information');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setChangeType('add_information');
    setDescription('');
  };

  const submit = async () => {
    if (!user || !script) return;
    if (!description.trim()) {
      toast.error('Please describe the requested change');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('script_change_requests').insert({
        client_id: user.id,
        wl_client_id: wlClientId,
        request_type: changeType,
        title: `${changeTypeLabel(changeType)}: ${script.title}`,
        description: description.trim(),
        proposed_changes: { wl_script_id: script.id, script_title: script.title },
        status: 'pending',
        source: 'wl_end_client',
      });
      if (error) throw error;

      toast.success('Change request submitted');
      reset();
      onClose(true);

      // Notify the WL partner owner — fire-and-forget, non-blocking (dialog already closed).
      if (partnerId) {
        Promise.resolve(
          supabase.from('white_label_partners').select('user_id').eq('id', partnerId).maybeSingle()
        )
          .then(({ data: partner }) => {
            if (!partner?.user_id) return;
            return supabase.from('notifications').insert({
              user_id: partner.user_id,
              title: 'Script Change Requested',
              message: `Script change requested by ${clientName} for ${script.title}`,
              category: 'script',
              action_url: `/white-label-dashboard/clients/${wlClientId}`,
            });
          })
          .catch(() => {}); // Notification failure must not surface to the user
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to submit change request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(false); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Script Change</DialogTitle>
          {script && <p className="text-sm text-muted-foreground">For: {script.title}</p>}
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Change Type</Label>
            <Select value={changeType} onValueChange={setChangeType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHANGE_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="change-description">Description *</Label>
            <Textarea
              id="change-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you'd like changed and why..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(false); }}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
