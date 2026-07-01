/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Rocket,
  PhoneCall,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMyClientGoLiveReadiness, useConfirmGoLive } from '@/hooks/campaign-os/useClientGoLive';
import type { GoLiveSnapshot } from '@/hooks/campaign-os/useGoLiveSnapshot';

interface CheckItemProps {
  label: string;
  description: string;
  state: 'pass' | 'fail' | 'pending';
}

function CheckItem({ label, description, state }: CheckItemProps) {
  const icon =
    state === 'pass' ? (
      <CheckCircle2 className="h-5 w-5 text-status-success mt-0.5 shrink-0" />
    ) : state === 'pending' ? (
      <Clock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
    ) : (
      <XCircle className="h-5 w-5 text-status-warning mt-0.5 shrink-0" />
    );

  const bg =
    state === 'pass'
      ? 'bg-status-success-bg/40'
      : state === 'pending'
      ? 'bg-muted/30'
      : 'bg-status-warning-bg/40';

  return (
    <div className={`flex items-start gap-3 rounded-md border p-3 ${bg}`}>
      {icon}
      <div className="min-w-0">
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </div>
  );
}

function CampaignReadinessCard({
  campaignId,
  campaignName,
  campaignStatus,
  snapshot,
}: {
  campaignId: string;
  campaignName: string;
  campaignStatus: string;
  snapshot: GoLiveSnapshot | null;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirm = useConfirmGoLive();

  const s = snapshot;

  const allAutomatedPass =
    (s?.script_published ?? false) &&
    (s?.faqs_ok ?? false) &&
    (s?.policies_ok ?? false) &&
    (s?.training_ok ?? false);

  const clientAlreadyConfirmed = s?.client_confirmed ?? false;
  const supervisorApproved = s?.supervisor_approved ?? false;
  const allDone = s?.all_ok ?? false;

  // Show confirm button when all automated checks pass and client hasn't confirmed yet
  const showConfirmBtn = allAutomatedPass && !clientAlreadyConfirmed;

  const handleConfirm = async () => {
    try {
      await confirm.mutateAsync(campaignId);
      toast.success('Confirmed! Your team will review and give final sign-off.');
      setConfirmOpen(false);

      // Fire-and-forget: notify all supervisors
      (async () => {
        try {
          const { data: supervisors } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'supervisor');
          if (!supervisors?.length) return;
          await supabase.from('notifications').insert(
            supervisors.map((s: { user_id: string }) => ({
              user_id: s.user_id,
              title: 'Client Ready for Go-Live',
              message: `A client has confirmed readiness for campaign "${campaignName}". Please review and approve in Go-Live Approvals.`,
              category: 'campaign',
              action_url: '/staff/supervisor/go-live',
            }))
          );
        } catch {}
      })();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to confirm');
    }
  };

  const checks: CheckItemProps[] = [
    {
      label: 'Script published',
      description: 'Your call handling script has been published by the 24H team.',
      state: s?.script_published ? 'pass' : 'fail',
    },
    {
      label: 'FAQs approved',
      description: 'Frequently-asked-question answers are approved and ready for agents.',
      state: s?.faqs_ok ? 'pass' : 'fail',
    },
    {
      label: 'Policies approved',
      description: 'Policy guidelines for agents are approved.',
      state: s?.policies_ok ? 'pass' : 'fail',
    },
    {
      label: 'Training complete',
      description: 'All required training modules have been signed off by the supervisor.',
      state: s?.training_ok ? 'pass' : 'fail',
    },
    {
      label: 'Your confirmation',
      description: clientAlreadyConfirmed
        ? 'You have confirmed this campaign is ready.'
        : 'Once all items above are ready, confirm you are satisfied to proceed.',
      state: clientAlreadyConfirmed ? 'pass' : allAutomatedPass ? 'fail' : 'pending',
    },
    {
      label: 'Supervisor sign-off',
      description: supervisorApproved
        ? 'The supervisor has approved this campaign for go-live.'
        : 'Waiting for supervisor review after your confirmation.',
      state: supervisorApproved ? 'pass' : clientAlreadyConfirmed ? 'fail' : 'pending',
    },
    {
      label: 'Five9 telephony configured',
      description: 'Our team is configuring the telephony system. No action required from you.',
      state: 'pending',
    },
  ];

  return (
    <>
      <Card
        className={
          allDone ? 'border-status-success' : allAutomatedPass ? 'border-primary' : undefined
        }
      >
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
          <div className="min-w-0">
            <CardTitle className="text-base">{campaignName}</CardTitle>
            <CardDescription>
              Status: <strong>{campaignStatus}</strong>
              {allDone && ' — All checks passed, campaign is cleared for activation.'}
            </CardDescription>
          </div>
          <Badge
            variant={allDone ? 'default' : 'outline'}
            className={
              allDone
                ? 'bg-status-success-bg text-status-success border-status-success shrink-0'
                : 'shrink-0'
            }
          >
            {allDone ? 'Ready' : 'In progress'}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-2">
          {!s && (
            <p className="text-sm text-muted-foreground py-2">
              Readiness data not yet available — check back shortly.
            </p>
          )}
          {s && checks.map((c) => <CheckItem key={c.label} {...c} />)}

          {s && showConfirmBtn && (
            <div className="pt-2">
              <Button onClick={() => setConfirmOpen(true)} className="w-full sm:w-auto">
                <Rocket className="h-4 w-4 mr-2" />
                Confirm ready to go live
              </Button>
            </div>
          )}

          {clientAlreadyConfirmed && !supervisorApproved && (
            <p className="text-sm text-muted-foreground pt-1">
              <Clock className="inline h-4 w-4 mr-1 align-text-bottom" />
              Waiting for supervisor sign-off. We'll notify you once the campaign is activated.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm go-live readiness</DialogTitle>
            <DialogDescription>
              You're confirming that <strong>{campaignName}</strong> is ready to go live. The
              supervisor will review and give final sign-off before activation.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={confirm.isPending}>
              {confirm.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Confirming…
                </>
              ) : (
                'Yes, confirm ready'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function ClientGoLiveReadiness() {
  const { data: campaigns, isLoading, error } = useMyClientGoLiveReadiness();

  return (
    <DashboardLayout>
      <div className="rounded-2xl border border-border p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 mb-6">
        <h1 className="text-2xl font-bold text-heading">Go-Live Readiness</h1>
        <p className="text-muted-foreground mt-0.5">Track campaign progress before going live. Confirm readiness when all checks pass.</p>
      </div>
      <div className="space-y-6">

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading readiness…
          </div>
        )}

        {error && (
          <Card>
            <CardContent className="p-6 text-sm text-destructive">
              Could not load readiness data. Please refresh or contact Support.
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && (campaigns?.length ?? 0) === 0 && (
          <Card>
            <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <PhoneCall className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="font-medium">No campaigns yet</div>
                <div className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Once your account team sets up a campaign, its readiness progress will appear
                  here.
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {campaigns?.map((c) => (
          <CampaignReadinessCard
            key={c.id}
            campaignId={c.id}
            campaignName={c.display_name}
            campaignStatus={c.status}
            snapshot={c.snapshot}
          />
        ))}
      </div>
    </DashboardLayout>
  );
}
