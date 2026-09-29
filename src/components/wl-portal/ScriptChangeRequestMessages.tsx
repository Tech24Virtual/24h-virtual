import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Message {
  id: string;
  sender_id: string;
  message: string;
  visible_to: string[];
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  requestTitle: string;
  /** Which side of the private thread the current viewer represents. */
  viewerRole: 'wl_client' | 'white_label';
  /** True once the WL Partner has forwarded this request to 24H Virtual. */
  forwardedTo24h: boolean;
  /** Display name for the other participant, e.g. the client or partner name. */
  otherPartyLabel: string;
}

/**
 * Private WL Client <-> WL Partner thread on a script change request.
 * 24H Virtual never sees this unless the partner has forwarded the request
 * (forwardedTo24h) — enforced server-side via RLS on visible_to, not here.
 */
export function ScriptChangeRequestMessages({
  open,
  onOpenChange,
  requestId,
  requestTitle,
  viewerRole,
  forwardedTo24h,
  otherPartyLabel,
}: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('script_change_request_messages')
      .select('id, sender_id, message, visible_to, created_at')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });
    if (!error && data) setMessages(data);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, requestId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!user || !draft.trim()) return;
    setSending(true);
    try {
      const visibleTo = forwardedTo24h
        ? ['wl_client', 'white_label', '24h']
        : ['wl_client', 'white_label'];
      const { error } = await supabase.from('script_change_request_messages').insert({
        request_id: requestId,
        sender_id: user.id,
        message: draft.trim(),
        visible_to: visibleTo,
      });
      if (error) throw error;
      setDraft('');
      await fetchMessages();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Message {otherPartyLabel}</DialogTitle>
          <p className="text-sm text-muted-foreground">Re: {requestTitle}</p>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="max-h-80 overflow-y-auto space-y-3 border rounded-md p-3 bg-muted/20">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading messages...</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No messages yet. Start the conversation with {otherPartyLabel}.
              </p>
            ) : (
              messages.map((m) => {
                const isMine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                        isMine ? 'bg-primary text-primary-foreground' : 'bg-card border'
                      }`}
                    >
                      {m.message}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {isMine ? 'You' : otherPartyLabel} · {format(new Date(m.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {viewerRole === 'white_label' && forwardedTo24h && (
            <p className="text-xs text-muted-foreground">
              This request has been forwarded to 24H Virtual — new messages will be visible to them too.
            </p>
          )}

          <div className="flex gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Message ${otherPartyLabel}...`}
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Button onClick={send} disabled={sending || !draft.trim()} className="self-end">
              {sending ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
