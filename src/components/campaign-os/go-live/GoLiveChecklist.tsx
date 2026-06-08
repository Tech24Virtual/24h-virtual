import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, ArrowRight, Loader2, ShieldAlert, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useGoLiveChecks, useForceActivateCampaign } from '@/hooks/campaign-os/useGoLiveChecks';
import { useGoLiveSnapshot } from '@/hooks/campaign-os/useGoLiveSnapshot';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  campaignId: string;
  campaignStatus: string;
}

export function GoLiveChecklist({ campaignId, campaignStatus }: Props) {
  const { data, isLoading, isFetching, dataUpdatedAt, refetch, error, failureCount } = useGoLiveChecks(campaignId);
  const snapshotQ = useGoLiveSnapshot(campaignId);
  const snapshot = snapshotQ.data;
  const { isAdmin } = useAuth();
  const forceActivate = useForceActivateCampaign();
  const [forceOpen, setForceOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [, setNowTick] = useState(0);
  const [lastErrorShownAt, setLastErrorShownAt] = useState<number | null>(null);

  // Re-render every 15s so the relative "Last updated" label stays fresh.
  useEffect(() => {
    const id = window.setInterval(() => setNowTick((n) => n + 1), 15_000);
    return () => window.clearInterval(id);
  }, []);

  // Surface refresh failures as a friendly toast with a retry action.
  // Dedupe on (failureCount + error message) so we don't spam on every poll.
  useEffect(() => {
    if (!error || failureCount === 0) return;
    const key = `${failureCount}:${(error as any)?.message ?? 'unknown'}`;
    if (lastErrorShownAt && String(lastErrorShownAt) === key) return;
    setLastErrorShownAt(Date.now());
    toast.error("Couldn't refresh go-live readiness", {
      id: `go-live-refresh-error-${campaignId}`,
      description:
        (error as any)?.message ??
        'We hit a network or server hiccup while checking the latest status.',
      action: {
        label: 'Retry',
        onClick: () => {
          void refetch();
        },
      },
      duration: 8000,
    });
  }, [error, failureCount, campaignId, refetch, lastErrorShownAt]);

  const lastUpdatedLabel = dataUpdatedAt
    ? `Last updated ${formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}`
    : 'Last updated just now';

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading checklist…
        </CardContent>
      </Card>
    );
  }
  if (!data) return null;

  const items: Array<{
    label: string;
    description: string;
    ok: boolean;
    fixHref: string;
    fixLabel: string;
    detail?: string;
    placeholder?: boolean;
  }> = [
    {
      label: 'Publish a script',
      description: 'The campaign needs at least one published script version.',
      ok: data.script_published,
      fixHref: `/admin/campaign-os/campaigns/${campaignId}/script`,
      fixLabel: 'Open Script Builder',
    },
    {
      label: 'Approve at least one FAQ',
      description: 'Agents need approved answers for common questions in this scope.',
      ok: data.faqs_ok,
      fixHref: `/admin/campaign-os/campaigns/${campaignId}?tab=faqs`,
      fixLabel: 'Go to FAQs tab',
      detail: `${data.faqs_approved_count} approved`,
    },
    {
      label: 'Approve at least one policy',
      description: 'Agents need at least one approved policy block in this scope.',
      ok: data.policies_ok,
      fixHref: `/admin/campaign-os/campaigns/${campaignId}?tab=policies`,
      fixLabel: 'Go to Policies tab',
      detail: `${data.policies_approved_count} approved`,
    },
    {
      label: 'Sign off required training',
      description: data.required_modules === 0
        ? 'No required training modules — automatically passes.'
        : `Supervisor must sign off ${data.required_modules} required module(s).`,
      ok: data.training_ok,
      fixHref: `/admin/campaign-os/campaigns/${campaignId}?tab=training`,
      fixLabel: 'Go to Training tab',
      detail: data.required_modules === 0 ? 'n/a' : `${data.required_signoffs}/${data.required_modules} signed off`,
    },
    {
      label: 'Client confirmation',
      description: snapshot?.client_confirmed
        ? 'Client has confirmed they are ready to go live.'
        : 'Waiting for the client to confirm readiness in their dashboard.',
      ok: snapshot?.client_confirmed ?? false,
      fixHref: `/client-dashboard/readiness`,
      fixLabel: 'Client readiness page',
    },
    {
      label: 'Supervisor sign-off',
      description: snapshot?.supervisor_approved
        ? 'Supervisor has approved this campaign for go-live.'
        : 'Supervisor must approve after client confirms.',
      ok: snapshot?.supervisor_approved ?? false,
      fixHref: `/staff/supervisor/go-live`,
      fixLabel: 'Go-Live Approvals',
    },
    {
      label: 'Five9 configured',
      description: 'Telephony configuration via Five9 (System 10 — coming soon).',
      ok: false,
      placeholder: true,
      fixHref: `/admin/campaign-os/five9`,
      fixLabel: 'Five9 mappings',
    },
  ];

  const handleForceActivate = async () => {
    try {
      await forceActivate.mutateAsync({ campaignId, reason: reason.trim() });
      toast.success('Campaign force-activated. Override recorded.');
      setForceOpen(false);
      setReason('');
    } catch (e: any) {
      toast.error(e?.message ?? 'Force activate failed');
    }
  };

  return (
    <div className="space-y-4">
      <Card className={data.all_ok ? 'border-status-success' : 'border-status-warning'}>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-base">Go-live checklist</CardTitle>
            <CardDescription>
              Current status: <strong>{campaignStatus}</strong> · Readiness:{' '}
              <strong>{data.all_ok ? 'Ready' : 'Not ready'}</strong>
            </CardDescription>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              {isFetching ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Refreshing readiness…</span>
                </>
              ) : (
                <span>{lastUpdatedLabel}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Refresh readiness"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Badge variant={data.all_ok ? 'default' : 'outline'}>
              {data.all_ok ? 'All checks pass' : 'Action required'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((it) => (
            <div
              key={it.label}
              className={`flex flex-wrap items-start justify-between gap-3 rounded-md border p-3 ${it.ok ? 'bg-status-success-bg/40' : 'bg-status-warning-bg/40'}`}
            >
              <div className="flex items-start gap-2 min-w-0 flex-1">
                {it.ok
                  ? <CheckCircle2 className="h-5 w-5 text-status-success mt-0.5 shrink-0" />
                  : <XCircle className="h-5 w-5 text-status-warning mt-0.5 shrink-0" />}
                <div className="min-w-0">
                  <div className="font-medium text-sm">{it.label}</div>
                  <div className="text-xs text-muted-foreground">{it.description}</div>
                  {it.detail && <div className="text-xs text-muted-foreground mt-0.5">{it.detail}</div>}
                </div>
              </div>
              {!it.ok && !it.placeholder && (
                <Button size="sm" variant="outline" asChild>
                  <Link to={it.fixHref}>{it.fixLabel}<ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
                </Button>
              )}
              {!it.ok && it.placeholder && (
                <Badge variant="outline" className="text-muted-foreground">Pending — team configuring</Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {isAdmin && !data.all_ok && campaignStatus !== 'active' && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-status-warning" /> Admin override
            </CardTitle>
            <CardDescription>
              Force-activate this campaign even though required checks are failing. This is recorded in the audit log.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setForceOpen(true)}>
              Force activate…
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={forceOpen} onOpenChange={setForceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force activate campaign</DialogTitle>
            <DialogDescription>
              Provide a reason. This is recorded against the campaign and to the audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Client requested go-live before training completion; will retro-sign within 48h."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForceOpen(false)}>Cancel</Button>
            <Button
              onClick={handleForceActivate}
              disabled={forceActivate.isPending || reason.trim().length < 3}
            >
              {forceActivate.isPending ? 'Activating…' : 'Force activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
