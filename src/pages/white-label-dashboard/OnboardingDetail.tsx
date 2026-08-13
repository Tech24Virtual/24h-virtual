import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  useWLPartnerHandoff,
  useWLPartnerHandoffMutations,
  type WLHandoffStatus,
} from '@/hooks/wl/useWLPartnerHandoffs';
import { WLClientPortalAccessCard } from '@/components/white-label/onboarding/WLClientPortalAccessCard';
import {
  WLHandoffChecklist,
  type ChecklistItem,
} from '@/components/white-label/onboarding/WLHandoffChecklist';
import { WLHandoffActivityCard } from '@/components/white-label/onboarding/WLHandoffActivityCard';
import { WLHandoffItemsTab } from '@/components/white-label/onboarding/WLHandoffItemsTab';
import { WLHandoffDocumentsTab } from '@/components/white-label/onboarding/WLHandoffDocumentsTab';
import { WLHandoffRequestsTab } from '@/components/white-label/onboarding/WLHandoffRequestsTab';
import { WLSubmitToFulfillmentCard } from '@/components/white-label/onboarding/WLSubmitToFulfillmentCard';
import { useWLHandoffRequests } from '@/hooks/wl/useWLHandoffRequests';
import {
  SUBMISSION_STATUS_LABEL,
  SUBMISSION_STATUS_VARIANT,
} from '@/lib/wl/fulfillmentStatus';
import { SEO } from '@/components/SEO';

export default function WLOnboardingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: handoff, isLoading } = useWLPartnerHandoff(id);
  const { updateHandoff } = useWLPartnerHandoffMutations();
  const { data: requests } = useWLHandoffRequests(id);

  const [notes, setNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);

  const activeTab = searchParams.get('tab') ?? 'snapshot';
  const focusKey = searchParams.get('focus');
  const setActiveTab = (t: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', t);
    if (t !== 'items' && t !== 'documents') next.delete('focus');
    setSearchParams(next, { replace: true });
  };
  const jumpToItem = (key: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'items');
    next.set('focus', key);
    setSearchParams(next, { replace: true });
  };
  const jumpToDocs = () => setActiveTab('documents');

  if (isLoading) {
    return (
        <div className="max-w-5xl space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
    );
  }

  if (!handoff) {
    return (
        <Card className="p-12 text-center max-w-4xl">
          <p className="font-medium">Handoff not found</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/white-label-dashboard/clients/onboarding')}
          >
            Back to onboarding
          </Button>
        </Card>
    );
  }

  const currentNotes = notesDirty ? notes : handoff.handoff_notes ?? '';
  const checklist: ChecklistItem[] = Array.isArray(handoff.checklist_state)
    ? handoff.checklist_state
    : [];
  const openRequestCount = (requests ?? []).filter((r) => r.status === 'open').length;
  const submissionStatus = handoff.submission_status ?? 'collecting_info';

  const handleChecklistChange = async (next: ChecklistItem[]) => {
    try {
      await updateHandoff.mutateAsync({
        id: handoff.id,
        updates: { checklist_state: next },
      });
    } catch {
      // mutation hook surfaces the error toast
    }
  };

  return (
    <>
      <SEO
        title={`Onboarding — ${handoff.client_name_snapshot || 'Client'}`}
        description="White-label partner onboarding handoff"
        suppressBranding
      />
      <div className="space-y-6 max-w-5xl">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2"
            onClick={() => navigate('/white-label-dashboard/clients/onboarding')}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to onboarding
          </Button>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">
                  {handoff.client_name_snapshot || 'Unnamed client'}
                </h1>
                <Badge variant="outline" className="capitalize">
                  {handoff.status.replace('_', ' ')}
                </Badge>
                <Badge variant={SUBMISSION_STATUS_VARIANT[submissionStatus]}>
                  {SUBMISSION_STATUS_LABEL[submissionStatus]}
                </Badge>
                {openRequestCount > 0 && (
                  <Badge variant="destructive">{openRequestCount} open request{openRequestCount > 1 ? 's' : ''}</Badge>
                )}
              </div>
              {handoff.proposal && (
                <Link
                  to={`/white-label-dashboard/clients/proposals/${handoff.proposal.id}`}
                  className="text-sm text-muted-foreground font-mono hover:text-primary"
                >
                  {handoff.proposal.proposal_number} · {handoff.proposal.title}
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Status</Label>
              <Select
                value={handoff.status}
                onValueChange={(v) =>
                  updateHandoff.mutate({
                    id: handoff.id,
                    updates: { status: v as WLHandoffStatus },
                  })
                }
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="snapshot">Snapshot</TabsTrigger>
                <TabsTrigger value="items">Intake items</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="requests">
                  Requests
                  {openRequestCount > 0 && (
                    <Badge variant="destructive" className="ml-2 h-4 px-1 text-[10px]">
                      {openRequestCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="snapshot" className="space-y-6 mt-4">
                <Card className="p-6 space-y-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Snapshot at acceptance
                  </h2>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Client</p>
                      <p>{handoff.client_name_snapshot || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p>{handoff.client_email_snapshot || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Company</p>
                      <p>{handoff.company_snapshot || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p>
                        {handoff.accepted_amount_snapshot != null
                          ? `${handoff.currency_snapshot ? handoff.currency_snapshot + ' ' : ''}${handoff.accepted_amount_snapshot.toLocaleString()}`
                          : '—'}
                      </p>
                    </div>
                  </div>
                  {handoff.accepted_scope_snapshot && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Scope</p>
                        <p className="text-sm whitespace-pre-wrap">
                          {handoff.accepted_scope_snapshot}
                        </p>
                      </div>
                    </>
                  )}
                </Card>

                <Card className="p-6 space-y-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Next steps checklist
                  </h2>
                  <WLHandoffChecklist
                    state={checklist}
                    onChange={handleChecklistChange}
                    disabled={updateHandoff.isPending}
                  />
                </Card>

                <Card className="p-6 space-y-3">
                  <Label htmlFor="notes" className="text-sm font-semibold">
                    Handoff notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={currentNotes}
                    onChange={(e) => {
                      setNotes(e.target.value.slice(0, 5000));
                      setNotesDirty(true);
                    }}
                    rows={5}
                    placeholder="Internal notes about this onboarding…"
                  />
                  {notesDirty && (
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNotesDirty(false);
                          setNotes('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={updateHandoff.isPending}
                        onClick={async () => {
                          await updateHandoff.mutateAsync({
                            id: handoff.id,
                            updates: { handoff_notes: notes },
                          });
                          setNotesDirty(false);
                          toast.success('Notes saved');
                        }}
                      >
                        Save notes
                      </Button>
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="items" className="mt-4">
                <WLHandoffItemsTab
                  handoffId={handoff.id}
                  templateKey={handoff.proposal?.checklist_template}
                  focusKey={focusKey}
                />
              </TabsContent>

              <TabsContent value="documents" className="mt-4">
                <WLHandoffDocumentsTab handoffId={handoff.id} />
              </TabsContent>

              <TabsContent value="requests" className="mt-4">
                <WLHandoffRequestsTab
                  handoffId={handoff.id}
                  onJumpToItem={jumpToItem}
                  onJumpToDocs={jumpToDocs}
                />
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <WLSubmitToFulfillmentCard
              handoffId={handoff.id}
              proposalId={handoff.proposal_id}
              partnerId={handoff.partner_id}
              submissionStatus={submissionStatus}
            />
            <WLHandoffActivityCard proposalId={handoff.proposal_id} />
            <WLClientPortalAccessCard
              handoffId={handoff.id}
              partnerId={handoff.partner_id}
              proposalId={handoff.proposal_id}
            />
          </div>
        </div>
      </div>
    </>
  );
}
