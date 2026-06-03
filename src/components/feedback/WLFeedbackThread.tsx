import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  listWLPartnerFeedbackMessages,
  postWLPartnerFeedbackMessage,
  type WLPartnerFeedbackMessage,
} from '@/lib/feedback/api';

export type WLThreadMode = 'partner_owner' | 'wl_end_client';

interface Props {
  feedbackId: string;
  parentStatus: string;
  mode: WLThreadMode;
  /** Display name to use for partner posts (end-client side). Falls back to "Support team". */
  partnerDisplayName?: string | null;
}

/**
 * Slice 5 — WL partner-owned conversation thread.
 * Strict rules:
 *  - Admin is excluded (RLS denies; not rendered for admin).
 *  - End-client surface NEVER shows "24H", "Platform", or any non-partner branding.
 *  - Bridge state is not rendered here.
 *  - Append-only; no edit/delete UI.
 */
export function WLFeedbackThread({
  feedbackId,
  parentStatus,
  mode,
  partnerDisplayName,
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<WLPartnerFeedbackMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [visible, setVisible] = useState(true); // partner side: default visible
  const [busy, setBusy] = useState(false);

  const isClosed = parentStatus === 'closed';
  const isResolved = parentStatus === 'resolved';

  const load = async () => {
    try {
      const rows = await listWLPartnerFeedbackMessages(feedbackId);
      setMessages(rows);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackId]);

  useEffect(() => {
    const ch = supabase
      .channel(`wl-fb-msgs-${feedbackId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wl_partner_feedback_messages',
          filter: `feedback_id=eq.${feedbackId}`,
        },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackId]);

  const submit = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await postWLPartnerFeedbackMessage({
        feedbackId,
        body: body.trim(),
        visibleToSubmitter: mode === 'partner_owner' ? visible : true,
      });
      await load();
      setBody('');
      if (mode === 'partner_owner') setVisible(true);
      toast({ title: 'Message sent' });
    } catch (e: any) {
      toast({
        title: 'Could not send message',
        description: e?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const submitterDisabledOnClosed = mode === 'wl_end_client' && isClosed;
  const partnerName = partnerDisplayName?.trim() || 'Support team';

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">Conversation</div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading conversation…</div>
      ) : error ? (
        <div className="text-sm text-destructive">{error}</div>
      ) : messages.length === 0 ? (
        <div className="text-sm text-muted-foreground">No messages yet.</div>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => {
            const mine = !!user?.id && m.author_user_id === user.id;
            let label: string;
            if (mode === 'partner_owner') {
              label =
                m.author_kind === 'partner'
                  ? mine
                    ? 'You'
                    : 'Team'
                  : m.author_role === 'wl_end_client'
                    ? 'Client'
                    : 'Submitter';
            } else {
              // wl_end_client
              label = m.author_kind === 'partner' ? partnerName : mine ? 'You' : 'You';
            }
            const isInternalPartnerNote =
              m.author_kind === 'partner' && !m.visible_to_submitter;
            return (
              <div key={m.id} className="rounded-md border p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span className="font-medium text-foreground">{label}</span>
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</span>
                  {mode === 'partner_owner' && isInternalPartnerNote && (
                    <Badge variant="outline" className="text-[10px] uppercase">Internal</Badge>
                  )}
                </div>
                <div className="text-sm whitespace-pre-wrap">{m.body}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Composer */}
      {submitterDisabledOnClosed ? (
        <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          This request is closed. You can no longer add messages.
        </div>
      ) : (
        <div className="space-y-2">
          {mode === 'wl_end_client' && isResolved && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
              This request was resolved. You can still add a follow-up note here; it will be
              treated as follow-up on a resolved request and will not reopen the conversation.
            </div>
          )}
          <Textarea
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={mode === 'partner_owner' ? 'Reply to this client…' : 'Write a message…'}
          />
          <div className="flex items-center justify-between gap-3">
            {mode === 'partner_owner' ? (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={isClosed ? false : visible}
                  disabled={isClosed}
                  onCheckedChange={(c) => setVisible(c === true)}
                />
                <span className={isClosed ? 'text-muted-foreground' : ''}>
                  Visible to client
                  {isClosed && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (closed: replies are internal only)
                    </span>
                  )}
                </span>
              </label>
            ) : (
              <span />
            )}
            <Button size="sm" onClick={submit} disabled={busy || !body.trim()}>
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
