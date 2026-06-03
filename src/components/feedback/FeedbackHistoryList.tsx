import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { listFeedbackMessages, type FeedbackMessage } from '@/lib/feedback/api';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

export type FeedbackHistoryMode = 'admin' | 'direct_client' | 'internal_staff';

interface FeedbackHistoryListProps {
  feedbackId: string;
  mode: FeedbackHistoryMode;
}

/**
 * Renders the append-only conversation thread for a 24H feedback row.
 * RLS already enforces what each role can see; this component only formats.
 *
 * - admin            → "24H Support" / submitter email; sees Internal badge on hidden replies
 * - direct_client    → "You" / "24H Support"
 * - internal_staff   → "You" / "Admin"
 */
export function FeedbackHistoryList({ feedbackId, mode }: FeedbackHistoryListProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const rows = await listFeedbackMessages(feedbackId);
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
      .channel(`feedback-messages-${feedbackId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feedback_messages', filter: `feedback_id=eq.${feedbackId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackId]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading conversation…</div>;
  if (error) return <div className="text-sm text-destructive">{error}</div>;
  if (messages.length === 0) return <div className="text-sm text-muted-foreground">No conversation yet.</div>;

  return (
    <div className="space-y-3">
      {messages.map((m) => {
        const mine = user?.id && m.author_user_id === user.id;
        let label: string;
        if (mode === 'admin') {
          label = m.author_kind === 'admin' ? '24H Support' : 'Submitter';
        } else if (mode === 'direct_client') {
          label = m.author_kind === 'admin' ? '24H Support' : mine ? 'You' : 'Submitter';
        } else {
          // internal_staff
          label = m.author_kind === 'admin' ? 'Admin' : mine ? 'You' : 'Submitter';
        }
        const isInternalAdmin = m.author_kind === 'admin' && !m.visible_to_submitter;
        return (
          <div key={m.id} className="rounded-md border p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span className="font-medium text-foreground">{label}</span>
              <span>·</span>
              <span>{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</span>
              {mode === 'admin' && isInternalAdmin && (
                <Badge variant="outline" className="text-[10px] uppercase">Internal</Badge>
              )}
            </div>
            <div className="text-sm whitespace-pre-wrap">{m.body}</div>
          </div>
        );
      })}
    </div>
  );
}
