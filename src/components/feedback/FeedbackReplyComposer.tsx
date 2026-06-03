import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { postFeedbackMessage } from '@/lib/feedback/api';

interface FeedbackReplyComposerProps {
  feedbackId: string;
  parentStatus: string;
  /** 'admin' shows the visibility checkbox; submitter modes hide it. */
  mode: 'admin' | 'submitter';
  /** Submitter framing flag — used for resolved follow-up copy. */
  resolvedFollowUp?: boolean;
  onPosted?: () => void;
}

export function FeedbackReplyComposer({
  feedbackId,
  parentStatus,
  mode,
  resolvedFollowUp,
  onPosted,
}: FeedbackReplyComposerProps) {
  const { toast } = useToast();
  const [body, setBody] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const isClosed = parentStatus === 'closed';
  const isResolved = parentStatus === 'resolved';
  const submitterDisabled = mode === 'submitter' && isClosed;

  const submit = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await postFeedbackMessage({
        feedbackId,
        body: body.trim(),
        visibleToSubmitter: mode === 'admin' ? visible : undefined,
      });
      setBody('');
      if (mode === 'admin') setVisible(false);
      onPosted?.();
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

  if (submitterDisabled) {
    return (
      <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        This feedback is closed. You can no longer add messages.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {mode === 'submitter' && resolvedFollowUp && isResolved && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
          This request was resolved. You can still add a follow-up note here; it will be treated as
          follow-up on a resolved request and will not reopen the conversation.
        </div>
      )}
      <Textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={mode === 'admin' ? 'Reply to this feedback…' : 'Write a message…'}
      />
      <div className="flex items-center justify-between gap-3">
        {mode === 'admin' ? (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={isClosed ? false : visible}
              disabled={isClosed}
              onCheckedChange={(c) => setVisible(c === true)}
            />
            <span className={isClosed ? 'text-muted-foreground' : ''}>
              Visible to submitter
              {isClosed && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (closed: replies are internal-only)
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
  );
}
