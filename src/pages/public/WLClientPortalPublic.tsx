import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  WLProposalPublicShell,
  type PublicBranding,
} from '@/components/wl-proposal-public/WLProposalPublicShell';
import { WLClientStatusTimeline } from '@/components/wl-proposal-public/WLClientStatusTimeline';
import { supabase } from '@/integrations/supabase/client';
import type { Phase } from '@/lib/wl/fulfillmentLifecycle';

interface Payload {
  branding: PublicBranding;
  proposal: {
    proposal_number: string;
    title: string;
    offering_name: string | null;
    scope_summary: string | null;
    amount: number | null;
    currency: string | null;
    accepted_at: string | null;
  };
  handoff: {
    status: string;
    kickoff_due_at: string | null;
    handoff_notes: string | null;
    started_at: string | null;
    completed_at: string | null;
  };
  next_steps: Array<{ label: string; completed: boolean }>;
  acknowledged_at: string | null;
  intake_phase?: string | null;
  requests_open_count?: number;
}

export default function WLClientPortalPublic() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acking, setAcking] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const { data: res, error } = await supabase.functions.invoke(
          'wl-client-portal-public',
          { body: { action: 'resolve', token } },
        );
        if (error) throw error;
        if (res?.error) {
          setError(res.error);
        } else {
          setData(res as Payload);
        }
      } catch (e) {
        setError('server_error');
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleAck = async () => {
    if (!token) return;
    setAcking(true);
    try {
      const { data: res, error } = await supabase.functions.invoke(
        'wl-client-portal-public',
        { body: { action: 'acknowledge', token } },
      );
      if (error) throw error;
      if (res?.error) {
        toast.error('Could not record acknowledgement');
      } else {
        setData((prev) =>
          prev ? { ...prev, acknowledged_at: new Date().toISOString() } : prev,
        );
        toast.success('Acknowledgement recorded');
      }
    } catch {
      toast.error('Could not record acknowledgement');
    } finally {
      setAcking(false);
    }
  };

  if (loading) {
    return (
      <WLProposalPublicShell branding={null}>
        <Helmet><title>Loading…</title></Helmet>
        <div className="space-y-4 max-w-3xl">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </WLProposalPublicShell>
    );
  }

  if (error || !data) {
    return (
      <WLProposalPublicShell branding={null}>
        <Helmet><title>Link unavailable</title></Helmet>
        <Card className="p-10 text-center max-w-xl mx-auto">
          <h1 className="text-xl font-semibold">This link is no longer available</h1>
          <p className="text-sm text-muted-foreground mt-2">
            It may have expired or been revoked. Please contact your provider for a new link.
          </p>
        </Card>
      </WLProposalPublicShell>
    );
  }

  const { branding, proposal, handoff, acknowledged_at } = data;
  const phase = (data.intake_phase ?? 'proposal_accepted') as Phase;
  const requestsOpen = data.requests_open_count ?? 0;

  return (
    <WLProposalPublicShell branding={branding}>
      <Helmet><title>{proposal.title} — Next steps</title></Helmet>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <p className="text-xs font-mono text-muted-foreground">{proposal.proposal_number}</p>
          <h1 className="text-2xl font-bold mt-1">{proposal.title}</h1>
          {proposal.accepted_at && (
            <p className="text-sm text-muted-foreground mt-1">
              Accepted {new Date(proposal.accepted_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {requestsOpen > 0 && (
          <Card className="p-4 border-destructive/40 bg-destructive/5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Action needed from your provider</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your provider needs additional information from you to continue.
                  Please get in touch with them to complete the next step.
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            What you accepted
          </h2>
          {proposal.offering_name && (
            <p className="font-medium">{proposal.offering_name}</p>
          )}
          {proposal.scope_summary && (
            <p className="text-sm whitespace-pre-wrap">{proposal.scope_summary}</p>
          )}
          {proposal.amount != null && (
            <p className="text-sm">
              <span className="text-muted-foreground">Amount: </span>
              <span className="font-medium">
                {proposal.currency ? `${proposal.currency} ` : ''}
                {proposal.amount.toLocaleString()}
              </span>
            </p>
          )}
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Progress
          </h2>
          <WLClientStatusTimeline phase={phase} acknowledged={!!acknowledged_at} />
          {handoff.kickoff_due_at && (
            <p className="text-xs text-muted-foreground">
              Kickoff target: {new Date(handoff.kickoff_due_at).toLocaleDateString()}
            </p>
          )}
        </Card>

        {!acknowledged_at ? (
          <Card className="p-6 text-center space-y-3">
            <p className="text-sm">
              Confirm you've reviewed the next steps so we can proceed with kickoff.
            </p>
            <Button onClick={handleAck} disabled={acking}>
              {acking ? 'Recording…' : 'I acknowledge next steps'}
            </Button>
          </Card>
        ) : (
          <Card className="p-6 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto text-primary mb-2" />
            <p className="font-medium">Acknowledged</p>
            <p className="text-xs text-muted-foreground mt-1">
              Recorded {new Date(acknowledged_at).toLocaleString()}
            </p>
          </Card>
        )}
      </div>
    </WLProposalPublicShell>
  );
}
