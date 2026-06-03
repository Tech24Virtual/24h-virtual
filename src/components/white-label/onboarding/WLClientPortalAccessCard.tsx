import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { Copy, Link as LinkIcon, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useWLClientPortalAccess,
  useWLClientPortalAccessMutations,
  useWLCanManagePortalLinks,
  type WLClientPortalAccess,
} from '@/hooks/wl/useWLClientPortalAccess';

interface Props {
  handoffId: string;
  partnerId: string;
  proposalId: string;
}

type StatusKind = 'active' | 'expiring' | 'acknowledged' | 'viewed' | 'sent' | 'expired' | 'revoked';

const SOON_MS = 48 * 60 * 60 * 1000;

function deriveStatus(l: WLClientPortalAccess): { kind: StatusKind; label: string } {
  if (l.revoked_at) return { kind: 'revoked', label: 'Revoked' };
  const expiresMs = l.expires_at ? new Date(l.expires_at).getTime() : null;
  if (expiresMs != null && expiresMs < Date.now()) return { kind: 'expired', label: 'Expired' };
  if (l.acknowledged_at) return { kind: 'acknowledged', label: 'Acknowledged' };
  if (expiresMs != null && expiresMs - Date.now() <= SOON_MS) {
    return { kind: 'expiring', label: 'Expiring soon' };
  }
  if (l.first_viewed_at) return { kind: 'viewed', label: 'Viewed' };
  return l.first_viewed_at ? { kind: 'viewed', label: 'Viewed' } : { kind: 'sent', label: 'Active' };
}

const DOT_COLOR: Record<StatusKind, string> = {
  active: 'bg-green-500',
  sent: 'bg-green-500',
  viewed: 'bg-primary',
  acknowledged: 'bg-blue-500',
  expiring: 'bg-amber-500',
  expired: 'bg-muted-foreground',
  revoked: 'bg-muted-foreground',
};

export function WLClientPortalAccessCard({ handoffId, partnerId, proposalId }: Props) {
  const { data: links, isLoading } = useWLClientPortalAccess(handoffId);
  const { createAccess, revokeAccess, regenerateAccess } =
    useWLClientPortalAccessMutations(handoffId);
  const canManage = useWLCanManagePortalLinks(partnerId);
  const [recipient, setRecipient] = useState('');
  const [revealedToken, setRevealedToken] = useState<string | null>(null);

  const buildUrl = (token: string) => `${window.location.origin}/c/${token}`;

  const handleCreate = async () => {
    const result = await createAccess.mutateAsync({
      partnerId,
      proposalId,
      handoffIdArg: handoffId,
      recipientEmail: recipient || null,
    });
    setRevealedToken(result.token);
    setRecipient('');
  };

  const handleRegenerate = async (oldId: string, recipientEmail: string | null) => {
    const result = await regenerateAccess.mutateAsync({
      oldId,
      partnerId,
      proposalId,
      handoffIdArg: handoffId,
      recipientEmail,
    });
    setRevealedToken(result.token);
  };

  const sortedLinks = useMemo(() => {
    if (!links) return [];
    // Active links first, then by created_at
    return [...links].sort((a, b) => {
      const aActive = !a.revoked_at && (!a.expires_at || new Date(a.expires_at).getTime() > Date.now());
      const bActive = !b.revoked_at && (!b.expires_at || new Date(b.expires_at).getTime() > Date.now());
      if (aActive !== bActive) return aActive ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [links]);

  return (
    <TooltipProvider delayDuration={150}>
      <Card className="p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Client portal access</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Generate a private link to share next steps with the client.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="recipient" className="text-xs">
            Recipient email (optional)
          </Label>
          <Input
            id="recipient"
            type="email"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value.slice(0, 254))}
            placeholder="client@example.com"
            disabled={!canManage}
          />
          {canManage ? (
            <Button
              size="sm"
              className="w-full"
              onClick={handleCreate}
              disabled={createAccess.isPending}
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              Generate client link
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block">
                  <Button size="sm" className="w-full" disabled>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Generate client link
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                You don't have permission to manage client links.
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {revealedToken && (
          <div className="rounded-md bg-muted/40 p-3 space-y-2">
            <p className="text-xs font-medium">Your link (copy now — only shown once):</p>
            <div className="flex gap-2">
              <Input value={buildUrl(revealedToken)} readOnly className="text-xs font-mono" />
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(buildUrl(revealedToken));
                  toast.success('Link copied');
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {!isLoading && sortedLinks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Links</p>
            {sortedLinks.map((l) => {
              const { kind, label } = deriveStatus(l);
              const isActive = kind !== 'revoked' && kind !== 'expired';
              return (
                <div
                  key={l.id}
                  className={cn(
                    'flex items-start justify-between gap-2 text-xs border rounded-md p-2',
                    !isActive && 'opacity-70',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{l.recipient_email || 'No recipient'}</p>
                    <div className="flex items-center gap-2 text-muted-foreground mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn('inline-block w-2 h-2 rounded-full', DOT_COLOR[kind])} />
                        <span>{label}</span>
                      </span>
                      <span>·</span>
                      <span>
                        {l.view_count} view{l.view_count === 1 ? '' : 's'}
                      </span>
                    </div>
                    {l.last_viewed_at && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Last viewed {formatDistanceToNow(new Date(l.last_viewed_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  {isActive && (
                    <div className="flex items-center gap-1 shrink-0">
                      {canManage ? (
                        <>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Regenerate link"
                                title="Regenerate link"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Regenerate link?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  A new link will be created and the current one will stop working
                                  immediately. Anyone using the old link will lose access.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRegenerate(l.id, l.recipient_email)}
                                >
                                  Regenerate
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Revoke link">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke this client link?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Anyone with the link will lose access immediately. You can generate
                                  a new link any time.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => revokeAccess.mutate(l.id)}>
                                  Revoke
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">
                              <Button variant="ghost" size="icon" disabled aria-label="Regenerate link">
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" disabled aria-label="Revoke link">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            You don't have permission to manage client links.
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <p className="text-[10px] text-muted-foreground leading-snug">
              Links are only shown once at creation. Use Regenerate to issue a new link if the
              previous one was lost.
            </p>
          </div>
        )}
      </Card>
    </TooltipProvider>
  );
}
