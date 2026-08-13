import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronLeft, Download, Pencil, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWLPartnerProposal } from '@/hooks/wl/useWLPartnerProposal';
import { useWLPartnerProposalMutations } from '@/hooks/wl/useWLPartnerProposalMutations';
import { useWLPartnerBranding } from '@/hooks/wl/useWLPartnerBranding';
import { useWLHandoffByProposal } from '@/hooks/wl/useWLPartnerHandoffs';
import {
  useWLProposalActivity,
  useWLProposalActivityMutations,
} from '@/hooks/wl/useWLProposalActivity';
import { useWLProposalShares } from '@/hooks/wl/useWLProposalShares';
import { useAuth } from '@/contexts/AuthContext';
import { WLProposalForm } from '@/components/white-label/proposals/WLProposalForm';
import { WLProposalStatusBadge } from '@/components/white-label/proposals/WLProposalStatusBadge';
import { WLProposalActivityLog } from '@/components/white-label/proposals/WLProposalActivityLog';
import { WLProposalShareCard } from '@/components/white-label/proposals/WLProposalShareCard';
import { downloadProposalPdf } from '@/lib/wl/proposalPdf';
import {
  WL_PROPOSAL_TRANSITIONS,
  canDelete,
  type WLProposalStatus,
} from '@/hooks/wl/wlProposalTransitions';
import { SEO } from '@/components/SEO';

export default function WLProposalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: proposal, isLoading } = useWLPartnerProposal(id);
  const { updateProposal, updateStatus, deleteProposal } =
    useWLPartnerProposalMutations();
  const { data: branding } = useWLPartnerBranding(proposal?.partner_id);
  const { data: activity, isLoading: activityLoading } = useWLProposalActivity(id);
  const { data: shares } = useWLProposalShares(id);
  const { data: linkedHandoff } = useWLHandoffByProposal(id);
  const { logActivity } = useWLProposalActivityMutations(id);

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendName, setSendName] = useState('');
  const [sendEmail, setSendEmail] = useState('');

  if (isLoading) {
    return (
        <div className="max-w-4xl space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
    );
  }

  if (!proposal) {
    return (
        <div className="max-w-4xl">
          <Card className="p-12 text-center">
            <p className="font-medium">Proposal not found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate('/white-label-dashboard/clients/proposals')}
            >
              Back to proposals
            </Button>
          </Card>
        </div>
    );
  }

  const status = proposal.status;
  const allowedTransitions = isAdmin
    ? (
        ['draft', 'sent', 'viewed', 'accepted', 'declined', 'expired'] as WLProposalStatus[]
      ).filter((s) => s !== status)
    : WL_PROPOSAL_TRANSITIONS[status];

  const deletable = canDelete(status, isAdmin);
  const hasActiveShare = !!shares?.some(
    (s) =>
      !s.revoked_at &&
      (!s.expires_at || new Date(s.expires_at).getTime() > Date.now()),
  );
  const canMarkSent = status === 'draft' && hasActiveShare;

  const handleExport = async () => {
    if (!branding) {
      toast.error('Branding not loaded yet');
      return;
    }
    setExporting(true);
    try {
      await downloadProposalPdf({ proposal, branding });
      if (proposal.partner_id) {
        logActivity.mutate({
          partner_id: proposal.partner_id,
          event_type: 'exported_pdf',
          metadata: { proposal_number: proposal.proposal_number },
        });
      }
      toast.success('PDF downloaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not export PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleMarkSent = async () => {
    await updateStatus.mutateAsync({
      id: proposal.id,
      from: status,
      to: 'sent',
      recipient_name: sendName || null,
      recipient_email: sendEmail || null,
    });
    setSendDialogOpen(false);
    setSendName('');
    setSendEmail('');
  };

  return (
    <>
      <SEO
        title={`${proposal.title} — Proposal`}
        description="White-label partner proposal detail"
        suppressBranding
      />
      <div className="space-y-6 max-w-4xl">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2"
            onClick={() => navigate('/white-label-dashboard/clients/proposals')}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to proposals
          </Button>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{proposal.title}</h1>
                <WLProposalStatusBadge
                  status={status}
                  validUntil={proposal.valid_until}
                />
              </div>
              <p className="text-sm text-muted-foreground font-mono mt-1">
                {proposal.proposal_number}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={exporting}
              >
                <Download className="w-4 h-4 mr-2" />
                {exporting ? 'Exporting…' : 'Export PDF'}
              </Button>
              {canMarkSent && (
                <Button size="sm" onClick={() => setSendDialogOpen(true)}>
                  <Send className="w-4 h-4 mr-2" />
                  Mark as sent
                </Button>
              )}
              {!editing && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
              {deletable && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          </div>
          {linkedHandoff && (
            <Link
              to={`/white-label-dashboard/clients/onboarding/${linkedHandoff.id}`}
              className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
            >
              Fulfillment in progress · view onboarding →
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {editing ? (
              <Card className="p-6">
                <WLProposalForm
                  initial={proposal}
                  status={status}
                  submitting={updateProposal.isPending}
                  submitLabel="Save changes"
                  onCancel={() => setEditing(false)}
                  onSubmit={async (values) => {
                    await updateProposal.mutateAsync({
                      id: proposal.id,
                      currentStatus: status,
                      updates: values,
                    });
                    setEditing(false);
                  }}
                />
              </Card>
            ) : (
              <Card className="p-6 space-y-5">
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Offering
                  </h2>
                  <p>{proposal.offering_name || <span className="text-muted-foreground">—</span>}</p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Amount
                    </h2>
                    <p className="text-lg font-medium">
                      {proposal.amount != null ? (
                        <>
                          {proposal.currency ? `${proposal.currency} ` : ''}
                          {proposal.amount.toLocaleString()}
                        </>
                      ) : (
                        <span className="text-muted-foreground text-base font-normal">—</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Valid until
                    </h2>
                    <p>
                      {proposal.valid_until
                        ? new Date(proposal.valid_until).toLocaleDateString()
                        : <span className="text-muted-foreground">—</span>}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Scope summary
                  </h2>
                  {proposal.scope_summary ? (
                    <p className="whitespace-pre-wrap text-sm">{proposal.scope_summary}</p>
                  ) : (
                    <p className="text-muted-foreground text-sm">No scope summary.</p>
                  )}
                </div>

                {proposal.notes && (
                  <>
                    <Separator />
                    <div>
                      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        Internal notes
                      </h2>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {proposal.notes}
                      </p>
                    </div>
                  </>
                )}

                {(proposal.last_recipient_name || proposal.last_recipient_email) && (
                  <>
                    <Separator />
                    <div>
                      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        Recipient
                      </h2>
                      <p className="text-sm">
                        {proposal.last_recipient_name || ''}
                        {proposal.last_recipient_name && proposal.last_recipient_email
                          ? ' · '
                          : ''}
                        {proposal.last_recipient_email && (
                          <span className="text-muted-foreground">
                            {proposal.last_recipient_email}
                          </span>
                        )}
                      </p>
                    </div>
                  </>
                )}
              </Card>
            )}

            {/* Status actions */}
            {allowedTransitions.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium mr-2">Move to:</span>
                  {allowedTransitions.map((next) => (
                    <Button
                      key={next}
                      variant="outline"
                      size="sm"
                      disabled={updateStatus.isPending}
                      onClick={() =>
                        updateStatus.mutate({ id: proposal.id, from: status, to: next })
                      }
                      className="capitalize"
                    >
                      {next}
                    </Button>
                  ))}
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-4">Linked lead</h3>
              {proposal.lead ? (
                <div className="space-y-1">
                  <Link
                    to={`/white-label-dashboard/clients/leads`}
                    className="font-medium text-primary hover:underline"
                  >
                    {proposal.lead.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{proposal.lead.email}</p>
                  {proposal.lead.company && (
                    <p className="text-xs text-muted-foreground">{proposal.lead.company}</p>
                  )}
                </div>
              ) : proposal.lead_id ? (
                <div className="text-sm text-muted-foreground">
                  The original lead for this proposal has been deleted. Proposal record preserved.
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No lead linked.</div>
              )}
            </Card>

            <WLProposalShareCard
              proposalId={proposal.id}
              partnerId={proposal.partner_id}
            />

            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-4">Activity</h3>
              <WLProposalActivityLog
                activity={activity ?? []}
                isLoading={activityLoading}
              />
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this proposal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{proposal.title}&quot;. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await deleteProposal.mutateAsync(proposal.id);
                setConfirmDelete(false);
                navigate('/white-label-dashboard/clients/proposals');
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as sent</DialogTitle>
            <DialogDescription>
              Confirm you have shared this proposal with the recipient. Optional
              recipient details will be saved for your records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="send-name">Recipient name (optional)</Label>
              <Input
                id="send-name"
                value={sendName}
                onChange={(e) => setSendName(e.target.value.slice(0, 200))}
                placeholder="Jane Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="send-email">Recipient email (optional)</Label>
              <Input
                id="send-email"
                type="email"
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value.slice(0, 254))}
                placeholder="jane@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setSendDialogOpen(false)}
              disabled={updateStatus.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleMarkSent} disabled={updateStatus.isPending}>
              <Send className="w-4 h-4 mr-2" />
              Confirm sent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
