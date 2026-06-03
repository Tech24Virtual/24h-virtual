import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  WLProposalPublicShell,
  type PublicBranding,
} from '@/components/wl-proposal-public/WLProposalPublicShell';

interface PublicProposal {
  proposal_number: string;
  title: string;
  offering_name: string | null;
  scope_summary: string | null;
  amount: number | null;
  currency: string | null;
  valid_until: string | null;
  status: string;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  accepted_by_name: string | null;
  declined_reason: string | null;
}

interface ResolvePayload {
  proposal: PublicProposal;
  branding: PublicBranding | null;
  share: { recipient_name: string | null; expires_at: string | null };
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wl-proposal-public`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function callPublic<T = unknown>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

export default function WLProposalPublic() {
  const { token = '' } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [data, setData] = useState<ResolvePayload | null>(null);

  // Action UI
  const [mode, setMode] = useState<'idle' | 'accept' | 'decline'>('idle');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorCode(null);
    callPublic<ResolvePayload & { error?: string }>({ action: 'resolve', token })
      .then((resp) => {
        if (cancelled) return;
        if ('error' in resp && resp.error) {
          setErrorCode(resp.error);
        } else {
          setData(resp);
        }
      })
      .catch(() => {
        if (!cancelled) setErrorCode('server_error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const refresh = async () => {
    const resp = await callPublic<ResolvePayload & { error?: string }>({
      action: 'resolve',
      token,
    });
    if (!('error' in resp) || !resp.error) setData(resp as ResolvePayload);
  };

  const submitAccept = async () => {
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    setSubmitting(true);
    const resp = await callPublic<{ ok?: boolean; error?: string }>({
      action: 'accept',
      token,
      accepted_by_name: name.trim(),
      acceptance_note: note.trim() || undefined,
    });
    setSubmitting(false);
    if (resp.error) {
      toast.error('Could not accept proposal');
      return;
    }
    toast.success('Proposal accepted');
    setMode('idle');
    await refresh();
  };

  const submitDecline = async () => {
    setSubmitting(true);
    const resp = await callPublic<{ ok?: boolean; error?: string }>({
      action: 'decline',
      token,
      declined_reason: reason.trim() || undefined,
    });
    setSubmitting(false);
    if (resp.error) {
      toast.error('Could not decline proposal');
      return;
    }
    toast.success('Response recorded');
    setMode('idle');
    await refresh();
  };

  if (loading) {
    return (
      <WLProposalPublicShell branding={null}>
        <Helmet>
          <title>Loading proposal…</title>
          <meta name="robots" content="noindex,nofollow" />
        </Helmet>
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-64 w-full" />
        </div>
      </WLProposalPublicShell>
    );
  }

  if (errorCode) {
    return (
      <WLProposalPublicShell branding={null}>
        <Helmet>
          <title>Proposal unavailable</title>
          <meta name="robots" content="noindex,nofollow" />
        </Helmet>
        <Card className="p-10 text-center">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h1 className="text-xl font-semibold mb-1">This proposal link is no longer available</h1>
          <p className="text-sm text-muted-foreground">
            The link may have expired or been revoked. Please contact the sender for assistance.
          </p>
        </Card>
      </WLProposalPublicShell>
    );
  }

  if (!data) return null;

  const { proposal, branding } = data;
  const isFinal = proposal.status === 'accepted' || proposal.status === 'declined';
  const isProposalExpired =
    proposal.status === 'expired' ||
    (!!proposal.valid_until && new Date(proposal.valid_until).getTime() < Date.now());
  const canAct = !isFinal && !isProposalExpired;

  const accentBg = 'hsl(var(--wl-primary, var(--primary)))';
  const accentText = 'hsl(var(--primary-foreground))';

  // Dedicated full-screen confirmation states (no proposal body shown)
  if (proposal.status === 'accepted') {
    return (
      <WLProposalPublicShell branding={branding}>
        <Helmet>
          <title>Proposal accepted</title>
          <meta name="robots" content="noindex,nofollow" />
        </Helmet>
        <Card className="p-10 text-center max-w-xl mx-auto">
          <div
            className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: accentBg, color: accentText }}
          >
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-semibold mb-2">Proposal accepted</h1>
          <p className="text-sm text-muted-foreground">
            {proposal.accepted_by_name
              ? `Thank you, ${proposal.accepted_by_name}.`
              : 'Thank you for accepting.'}
          </p>
          {proposal.accepted_at && (
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(proposal.accepted_at).toLocaleString()}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-4 font-mono">
            {proposal.proposal_number}
          </p>
        </Card>
      </WLProposalPublicShell>
    );
  }

  if (proposal.status === 'declined') {
    return (
      <WLProposalPublicShell branding={branding}>
        <Helmet>
          <title>Response recorded</title>
          <meta name="robots" content="noindex,nofollow" />
        </Helmet>
        <Card className="p-10 text-center max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center bg-muted text-muted-foreground">
            <XCircle className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-semibold mb-2">Response recorded</h1>
          <p className="text-sm text-muted-foreground">
            Thank you for letting us know. The sender has been notified.
          </p>
          {proposal.declined_at && (
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(proposal.declined_at).toLocaleString()}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-4 font-mono">
            {proposal.proposal_number}
          </p>
        </Card>
      </WLProposalPublicShell>
    );
  }

  if (isProposalExpired) {
    return (
      <WLProposalPublicShell branding={branding}>
        <Helmet>
          <title>Proposal expired</title>
          <meta name="robots" content="noindex,nofollow" />
        </Helmet>
        <Card className="p-10 text-center max-w-xl mx-auto">
          <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h1 className="text-xl font-semibold mb-1">This proposal has expired</h1>
          <p className="text-sm text-muted-foreground">
            Please contact the sender to request a new proposal.
          </p>
        </Card>
      </WLProposalPublicShell>
    );
  }

  return (
    <WLProposalPublicShell branding={branding}>
      <Helmet>
        <title>{proposal.title}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="space-y-1 mb-8">
        <p className="text-xs font-mono text-muted-foreground">{proposal.proposal_number}</p>
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ fontFamily: 'var(--wl-font-heading, inherit)' }}
        >
          {proposal.title}
        </h1>
      </div>

      <Card className="p-6 space-y-5">
        {proposal.offering_name && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Offering
            </h2>
            <p>{proposal.offering_name}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Amount
            </h2>
            <p className="text-2xl font-semibold">
              {proposal.amount != null ? (
                <>
                  {proposal.currency ? `${proposal.currency} ` : ''}
                  {proposal.amount.toLocaleString()}
                </>
              ) : (
                <span className="text-base font-normal text-muted-foreground">—</span>
              )}
            </p>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Valid until
            </h2>
            <p>
              {proposal.valid_until
                ? new Date(proposal.valid_until).toLocaleDateString()
                : '—'}
            </p>
          </div>
        </div>

        {proposal.scope_summary && (
          <>
            <Separator />
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Scope
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {proposal.scope_summary}
              </p>
            </div>
          </>
        )}
      </Card>

      {canAct && (
        <div className="mt-8">
          {mode === 'idle' && (
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={() => setMode('accept')}
                style={{ backgroundColor: accentBg, color: accentText }}
                className="hover:opacity-90"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Accept proposal
              </Button>
              <Button size="lg" variant="outline" onClick={() => setMode('decline')}>
                <XCircle className="w-4 h-4 mr-2" />
                Decline
              </Button>
            </div>
          )}

          {mode === 'accept' && (
            <Card className="p-5 space-y-4">
              <h3 className="font-semibold">Accept this proposal</h3>
              <div className="space-y-2">
                <Label htmlFor="acc-name">Your full name</Label>
                <Input
                  id="acc-name"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 200))}
                  placeholder="Jane Smith"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acc-note">Note (optional)</Label>
                <Textarea
                  id="acc-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 2000))}
                  placeholder="Anything the sender should know…"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setMode('idle')} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  onClick={submitAccept}
                  disabled={submitting}
                  style={{ backgroundColor: accentBg, color: accentText }}
                  className="hover:opacity-90"
                >
                  Confirm acceptance
                </Button>
              </div>
            </Card>
          )}

          {mode === 'decline' && (
            <Card className="p-5 space-y-4">
              <h3 className="font-semibold">Decline this proposal</h3>
              <div className="space-y-2">
                <Label htmlFor="dec-reason">Reason (optional)</Label>
                <Textarea
                  id="dec-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, 2000))}
                  placeholder="Let the sender know why…"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setMode('idle')} disabled={submitting}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={submitDecline} disabled={submitting}>
                  Confirm decline
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </WLProposalPublicShell>
  );
}
