import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { Copy, ExternalLink, Link2, Plus, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import {
  useWLProposalShares,
  useWLProposalShareMutations,
  type WLProposalShare,
} from '@/hooks/wl/useWLProposalShares';
import { useWLProposalActivityMutations } from '@/hooks/wl/useWLProposalActivity';

interface Props {
  proposalId: string;
  partnerId: string | null;
}

function buildShareUrl(token: string): string {
  return `${window.location.origin}/p/${token}`;
}

export function WLProposalShareCard({ proposalId, partnerId }: Props) {
  const { data: shares, isLoading } = useWLProposalShares(proposalId);
  const { createShare, revokeShare } = useWLProposalShareMutations(proposalId);
  const { logActivity } = useWLProposalActivityMutations(proposalId);
  const [creating, setCreating] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<string>('30');
  const [latestRawToken, setLatestRawToken] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  const activeShare = shares?.find(
    (s) =>
      !s.revoked_at &&
      (!s.expires_at || new Date(s.expires_at).getTime() > Date.now()),
  );

  const handleCreate = async () => {
    if (!partnerId) {
      toast.error('Missing partner context');
      return;
    }
    const days = parseInt(expiresInDays, 10);
    const expiresAt =
      Number.isFinite(days) && days > 0
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
        : null;
    const result = await createShare.mutateAsync({
      partner_id: partnerId,
      recipient_name: recipientName || null,
      recipient_email: recipientEmail || null,
      expires_at: expiresAt,
    });
    if (result?._raw_token) {
      setLatestRawToken(result._raw_token);
      // Auto-copy on creation
      try {
        await navigator.clipboard.writeText(buildShareUrl(result._raw_token));
        toast.success('Link copied to clipboard');
      } catch {
        // ignore clipboard errors
      }
    }
    if (result?.id) {
      logActivity.mutate({
        partner_id: partnerId,
        event_type: 'share_link_created',
        share_id: result.id,
        actor_label: recipientName || recipientEmail || null,
        metadata: {
          recipient_name: recipientName || null,
          recipient_email: recipientEmail || null,
          expires_at: expiresAt,
        },
      });
    }
    setCreating(false);
    setRecipientName('');
    setRecipientEmail('');
  };

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(buildShareUrl(token));
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          Share link
        </h3>
        {!creating && !activeShare && (
          <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Create
          </Button>
        )}
      </div>

      {creating && (
        <div className="space-y-3 mb-4">
          <div className="space-y-1.5">
            <Label htmlFor="rec-name" className="text-xs">Recipient name (optional)</Label>
            <Input
              id="rec-name"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value.slice(0, 200))}
              placeholder="Jane Smith"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rec-email" className="text-xs">Recipient email (optional)</Label>
            <Input
              id="rec-email"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value.slice(0, 254))}
              placeholder="jane@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-days" className="text-xs">Expires in (days, blank = never)</Label>
            <Input
              id="exp-days"
              type="number"
              min={1}
              max={365}
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCreating(false)}
              disabled={createShare.isPending}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={createShare.isPending}>
              Create link
            </Button>
          </div>
        </div>
      )}

      {/* Just-created token (one-time display) */}
      {latestRawToken && (
        <div className="rounded-md border bg-muted/30 p-3 mb-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            New link (copy now — token is shown only once)
          </p>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={buildShareUrl(latestRawToken)}
              className="text-xs font-mono"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button size="icon" variant="outline" onClick={() => copyLink(latestRawToken)}>
              <Copy className="w-4 h-4" />
            </Button>
            <Button asChild size="icon" variant="outline">
              <a href={buildShareUrl(latestRawToken)} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setLatestRawToken(null)}
          >
            Done
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : !shares?.length ? (
        !creating &&
        !latestRawToken && (
          <p className="text-xs text-muted-foreground">
            No share link yet. Create one to send this proposal to a recipient.
          </p>
        )
      ) : (
        <ul className="space-y-3">
          {shares.map((s) => (
            <ShareRow
              key={s.id}
              share={s}
              onRevoke={() => setConfirmRevokeId(s.id)}
            />
          ))}
        </ul>
      )}

      <AlertDialog
        open={!!confirmRevokeId}
        onOpenChange={(open) => !open && setConfirmRevokeId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this share link?</AlertDialogTitle>
            <AlertDialogDescription>
              The link will stop working immediately. You can create a new link afterward.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmRevokeId) {
                  const share = shares?.find((s) => s.id === confirmRevokeId);
                  await revokeShare.mutateAsync(confirmRevokeId);
                  if (partnerId && share) {
                    logActivity.mutate({
                      partner_id: partnerId,
                      event_type: 'share_link_revoked',
                      share_id: share.id,
                      actor_label:
                        share.recipient_name || share.recipient_email || null,
                    });
                  }
                }
                setConfirmRevokeId(null);
              }}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function ShareRow({
  share,
  onRevoke,
}: {
  share: WLProposalShare;
  onRevoke: () => void;
}) {
  const isRevoked = !!share.revoked_at;
  const isExpired =
    !!share.expires_at && new Date(share.expires_at).getTime() < Date.now();

  let statusLabel = 'Active';
  let statusVariant: 'default' | 'secondary' | 'outline' = 'default';
  if (isRevoked) {
    statusLabel = 'Revoked';
    statusVariant = 'outline';
  } else if (isExpired) {
    statusLabel = 'Expired';
    statusVariant = 'secondary';
  }

  return (
    <li className="rounded-md border p-3 space-y-2 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="font-medium">
            {share.recipient_name || share.recipient_email || 'Untitled link'}
          </p>
          {share.recipient_email && share.recipient_name && (
            <p className="text-muted-foreground">{share.recipient_email}</p>
          )}
        </div>
        <Badge variant={statusVariant}>{statusLabel}</Badge>
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
        <span>Created</span>
        <span className="text-foreground">
          {new Date(share.created_at).toLocaleDateString()}
        </span>
        <span>Expires</span>
        <span className="text-foreground">
          {share.expires_at
            ? new Date(share.expires_at).toLocaleDateString()
            : 'Never'}
        </span>
        <span className="flex items-center gap-1">
          <Eye className="w-3 h-3" /> Views
        </span>
        <span className="text-foreground">{share.view_count}</span>
        {share.last_viewed_at && (
          <>
            <span>Last viewed</span>
            <span className="text-foreground">
              {new Date(share.last_viewed_at).toLocaleString()}
            </span>
          </>
        )}
      </div>
      {!isRevoked && (
        <div className="flex justify-end pt-1">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onRevoke}>
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Revoke
          </Button>
        </div>
      )}
    </li>
  );
}
