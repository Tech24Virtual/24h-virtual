import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { WLProposalLeadPicker } from './WLProposalLeadPicker';
import {
  canEditField,
  type WLProposalStatus,
} from '@/hooks/wl/wlProposalTransitions';
import type { WLProposalInput } from '@/hooks/wl/useWLPartnerProposalMutations';
import type { WLPartnerProposal } from '@/hooks/wl/useWLPartnerProposals';

interface Props {
  initial?: Partial<WLPartnerProposal> | null;
  /** Status used to compute editability. Defaults to 'draft' for new proposals. */
  status?: WLProposalStatus;
  /** Optional pre-selected lead (e.g. when creating from a lead detail). */
  defaultLeadId?: string | null;
  onSubmit: (values: WLProposalInput) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
  submitting?: boolean;
}

function toDateInput(ts: string | null | undefined): string {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

export function WLProposalForm({
  initial,
  status = 'draft',
  defaultLeadId = null,
  onSubmit,
  onCancel,
  submitLabel = 'Save proposal',
  submitting,
}: Props) {
  const { isAdmin } = useAuth();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [leadId, setLeadId] = useState<string | null>(
    initial?.lead_id ?? defaultLeadId ?? null,
  );
  const [offeringName, setOfferingName] = useState(initial?.offering_name ?? '');
  const [scopeSummary, setScopeSummary] = useState(initial?.scope_summary ?? '');
  const [amount, setAmount] = useState<string>(
    initial?.amount != null ? String(initial.amount) : '',
  );
  const [currency, setCurrency] = useState(initial?.currency ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [validUntil, setValidUntil] = useState(toDateInput(initial?.valid_until));

  useEffect(() => {
    if (initial) {
      setTitle(initial.title ?? '');
      setLeadId(initial.lead_id ?? null);
      setOfferingName(initial.offering_name ?? '');
      setScopeSummary(initial.scope_summary ?? '');
      setAmount(initial.amount != null ? String(initial.amount) : '');
      setCurrency(initial.currency ?? '');
      setNotes(initial.notes ?? '');
      setValidUntil(toDateInput(initial.valid_until));
    }
  }, [initial]);

  const can = (field: string) => canEditField(status, field, isAdmin);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = amount.trim() === '' ? null : Number(amount);
    if (parsedAmount != null && (isNaN(parsedAmount) || parsedAmount < 0)) {
      return;
    }
    await onSubmit({
      title: title.trim(),
      lead_id: leadId,
      offering_name: offeringName.trim() || null,
      scope_summary: scopeSummary.trim() || null,
      amount: parsedAmount,
      currency: currency.trim() || null,
      notes: notes.trim() || null,
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="prop-title">Title *</Label>
        <Input
          id="prop-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
          disabled={!can('title')}
          placeholder="Q2 Receptionist Package"
        />
      </div>

      <div className="space-y-2">
        <Label>Linked lead</Label>
        <WLProposalLeadPicker
          value={leadId}
          onChange={setLeadId}
          disabled={!can('lead_id')}
        />
        <p className="text-xs text-muted-foreground">
          Optional. Only your leads are shown.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="prop-offering">Offering name</Label>
          <Input
            id="prop-offering"
            value={offeringName}
            onChange={(e) => setOfferingName(e.target.value)}
            maxLength={200}
            disabled={!can('offering_name')}
            placeholder="e.g. Reception, AI Voice, Outbound"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prop-valid">Valid until</Label>
          <Input
            id="prop-valid"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            disabled={!can('valid_until')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="prop-amount">Amount</Label>
          <Input
            id="prop-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!can('amount')}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prop-currency">Currency</Label>
          <Input
            id="prop-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            maxLength={8}
            disabled={!can('currency')}
            placeholder="e.g. USD, CAD, EUR"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="prop-scope">Scope summary</Label>
        <Textarea
          id="prop-scope"
          value={scopeSummary}
          onChange={(e) => setScopeSummary(e.target.value)}
          maxLength={5000}
          rows={5}
          disabled={!can('scope_summary')}
          placeholder="What's included, deliverables, terms..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="prop-notes">Internal notes</Label>
        <Textarea
          id="prop-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={5000}
          rows={3}
          disabled={!can('notes')}
          placeholder="Notes for your team. Not shown to recipient."
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting || !title.trim()}>
          {submitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
