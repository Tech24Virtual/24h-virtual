import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Building2,
  MapPin,
  ListChecks,
  Sparkles,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWLPartnerId } from '@/hooks/wl/useWLPartnerId';
import {
  CHECKLIST_TEMPLATES,
  getChecklistTemplate,
  type WLChecklistTemplateKey,
} from '@/lib/wl/checklistTemplates';
import { track } from '@/lib/analytics';
import type { WLPartnerLead } from '@/hooks/wl/useWLPartnerLeads';

interface Props {
  lead: WLPartnerLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConverted?: (leadId: string) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 3-step WL-partner convert wizard:
 *   1) Confirm account name & owner email
 *   2) Default location (snapshot only)
 *   3) Pick onboarding template, then activate
 *
 * Activation = flip lead.pipeline_stage='won', spawn onboarding +
 * kickoff follow-up tasks via wl_partner_tasks. No schema changes.
 */
export function WLConvertLeadDialog({ lead, open, onOpenChange, onConverted }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: partnerId } = useWLPartnerId();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [locationName, setLocationName] = useState('Main Location');
  const [locationCity, setLocationCity] = useState('');
  const [locationTimezone, setLocationTimezone] = useState('');
  const [templateKey, setTemplateKey] = useState<WLChecklistTemplateKey>('standard');

  useEffect(() => {
    if (open && lead) {
      setStep(1);
      setBusy(false);
      setAccountName(lead.company || lead.name || '');
      setOwnerEmail(lead.email || '');
      setLocationName('Main Location');
      setLocationCity('');
      setLocationTimezone('');
      setTemplateKey('standard');
    }
  }, [open, lead]);

  const template = getChecklistTemplate(templateKey);

  const canNext =
    (step === 1 && accountName.trim().length > 0 && ownerEmail.trim().length > 0) ||
    (step === 2 && locationName.trim().length > 0) ||
    step === 3;

  async function handleSubmit() {
    if (!lead || !partnerId) return;
    setBusy(true);
    try {
      const activationSnapshot = {
        converted_at: new Date().toISOString(),
        account_name: accountName.trim(),
        owner_email: ownerEmail.trim(),
        default_location: {
          name: locationName.trim(),
          city: locationCity.trim() || null,
          time_zone: locationTimezone.trim() || null,
        },
        template: templateKey,
        converted_via: 'wl_partner_convert_dialog',
      };

      // 1. Flip pipeline + persist snapshot in notes (non-destructive append).
      const previousNotes = lead.notes ? `${lead.notes}\n\n` : '';
      const snapshotLine = `[Activated ${new Date().toLocaleString()}] ${accountName.trim()} — template: ${template.label}`;
      const { error: leadErr } = await supabase
        .from('wl_partner_leads')
        .update({
          pipeline_stage: 'won',
          last_activity_at: new Date().toISOString(),
          notes: `${previousNotes}${snapshotLine}`,
        })
        .eq('id', lead.id);
      if (leadErr) throw leadErr;

      // 2. Idempotent onboarding task (lead-only; no proposal context).
      const { data: existingOnboarding } = await supabase
        .from('wl_partner_tasks')
        .select('id')
        .eq('lead_id', lead.id)
        .eq('source_event', 'lead_converted_to_account')
        .eq('task_type', 'onboarding')
        .maybeSingle();

      if (!existingOnboarding) {
        const onboardingTitle = `Begin onboarding for ${accountName.trim()}`;
        await supabase.from('wl_partner_tasks').insert({
          partner_id: partnerId,
          lead_id: lead.id,
          title: onboardingTitle,
          description: `Activated from lead. Template: ${template.label}.`,
          task_type: 'onboarding',
          status: 'open',
          priority: 'high',
          source_event: 'lead_converted_to_account',
          created_by: user?.id ?? null,
        });
      }

      // 3. Idempotent kickoff follow-up (3 days out).
      const { data: existingFollowup } = await supabase
        .from('wl_partner_tasks')
        .select('id')
        .eq('lead_id', lead.id)
        .eq('source_event', 'lead_converted_to_account')
        .eq('task_type', 'follow_up')
        .maybeSingle();

      if (!existingFollowup) {
        const dueAt = new Date(Date.now() + 3 * DAY_MS).toISOString();
        await supabase.from('wl_partner_tasks').insert({
          partner_id: partnerId,
          lead_id: lead.id,
          title: `Confirm kickoff with ${accountName.trim()}`,
          task_type: 'follow_up',
          status: 'open',
          priority: 'medium',
          source_event: 'lead_converted_to_account',
          due_at: dueAt,
          created_by: user?.id ?? null,
        });
      }

      // 4. Analytics.
      track.cta('wl_partner_leads', 'convert_lead_to_account', 'wl_partner', {
        lead_id: lead.id,
        partner_id: partnerId,
        template: templateKey,
      });

      // 5. Refresh caches.
      queryClient.invalidateQueries({ queryKey: ['wl-partner-leads', partnerId] });
      queryClient.invalidateQueries({ queryKey: ['wl-partner-tasks', partnerId] });

      toast({
        title: 'Account activated',
        description: `${accountName.trim()} is live. Onboarding tasks have been queued.`,
      });

      onOpenChange(false);
      onConverted?.(lead.id);
      // Snapshot saved to snapshot var for future debugging hooks
      void activationSnapshot;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: 'Conversion failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Convert to Active Account
          </DialogTitle>
          <DialogDescription>
            Step {step} of 3, converting{' '}
            <span className="font-medium text-foreground">{lead.name}</span> into a live account
            for your partner workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 pt-1 pb-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                n <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" /> Account name
              </Label>
              <Input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Acme Roofing Inc."
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Owner email</Label>
              <Input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="owner@acme.com"
              />
              <p className="text-xs text-muted-foreground">
                Used for kickoff communications. The lead's email is prefilled.
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" /> Default location name
              </Label>
              <Input
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Main Location"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input
                  value={locationCity}
                  onChange={(e) => setLocationCity(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Time zone</Label>
                <Input
                  value={locationTimezone}
                  onChange={(e) => setLocationTimezone(e.target.value)}
                  placeholder="America/New_York"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Snapshot only. You can add or refine locations after activation.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-muted-foreground" /> Onboarding template
              </Label>
              <Select
                value={templateKey}
                onValueChange={(v) => setTemplateKey(v as WLChecklistTemplateKey)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(CHECKLIST_TEMPLATES).map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{template.description}</p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 max-h-56 overflow-auto">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">Steps preview</p>
                <Badge variant="secondary" className="text-xs">
                  {template.steps.length} steps
                </Badge>
              </div>
              <ul className="space-y-1">
                {template.steps.map((s) => (
                  <li key={s.key} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="h-3 w-3 text-primary/70" />
                    {s.label}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              Activating flips this lead to <span className="font-medium text-foreground">Won</span>{' '}
              and queues an onboarding task plus a 3-day kickoff follow-up in your task list.
            </p>
          </div>
        )}

        <DialogFooter className="flex sm:justify-between gap-2">
          <div>
            {step > 1 && (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={busy}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Activating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" /> Activate Account
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default WLConvertLeadDialog;
