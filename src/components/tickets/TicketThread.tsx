import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChatMessage } from './ChatMessage';

export interface TicketThreadProps {
  ticketId: string;
  sourceTable: 'support_tickets' | 'wl_client_tickets';
  currentUserId: string;
  currentUserRole?: string;
  showInternalToggle?: boolean;
  onStatusChange?: (newStatus: string) => void;
  className?: string;
}

// Roles that belong to the WL-partner side (used to derive isSender for wl_client_ticket_replies)
const WL_PARTNER_ROLES = new Set([
  'partner_owner',
  'partner_manager',
  'partner_agent',
  'partner_internal',
  'white_label',
]);

export function TicketThread({
  ticketId,
  sourceTable,
  currentUserId,
  currentUserRole,
  showInternalToggle = false,
  className,
}: TicketThreadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const repliesEndRef = useRef<HTMLDivElement>(null);

  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const isWLLane = sourceTable === 'wl_client_tickets';
  const repliesQueryKey = isWLLane
    ? ['wl-ticket-replies', ticketId]
    : ['ticket-replies', ticketId];

  // Fetch replies
  const { data: replies = [], isLoading } = useQuery({
    queryKey: repliesQueryKey,
    queryFn: async () => {
      if (isWLLane) {
        const { data, error } = await supabase
          .from('wl_client_ticket_replies')
          .select('id, ticket_id, message, author_name, author_type, author_role, is_internal, created_at')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        return (data ?? []).map((r) => ({
          id: r.id,
          message: r.message,
          author_name: r.author_name ?? null,
          author_id: null as string | null,
          author_type: r.author_type ?? null,
          is_internal: r.is_internal ?? false,
          created_at: r.created_at,
        }));
      }

      let query = supabase
        .from('ticket_replies')
        .select('id, ticket_id, message, author_name, author_id, author_role, is_internal, created_at')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (!showInternalToggle) {
        query = query.eq('is_internal', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        message: r.message,
        author_name: r.author_name ?? null,
        author_id: r.author_id ?? null,
        author_type: null as string | null,
        is_internal: r.is_internal ?? false,
        created_at: r.created_at,
      }));
    },
    enabled: !!ticketId,
  });

  // Realtime: direct lane reuses existing table subscription pattern;
  // WL lane subscribes to wl_client_ticket_replies with a local channel.
  useEffect(() => {
    if (!ticketId) return;

    const table = isWLLane ? 'wl_client_ticket_replies' : 'ticket_replies';
    const channelName = `${table}-${ticketId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table, filter: `ticket_id=eq.${ticketId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: repliesQueryKey });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // repliesQueryKey is a new array each render; depend on its stable parts instead
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, isWLLane, queryClient]);

  // Auto-scroll when new replies arrive
  useEffect(() => {
    if (replies.length > 0) {
      repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [replies.length]);

  // Post reply via edge function
  const sendMutation = useMutation({
    mutationFn: async () => {
      console.log('[TicketThread] invoking edge fn:', { table: sourceTable, id: ticketId, action: 'post_message' });
      const { error } = await supabase.functions.invoke('update-ticket-status', {
        body: {
          table: sourceTable,
          id: ticketId,
          action: 'post_message',
          body: replyText.trim(),
          internal_note: showInternalToggle ? isInternal : false,
        },
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repliesQueryKey });
      setReplyText('');
      setIsInternal(false);
      toast({ title: 'Reply sent' });
      setTimeout(() => {
        repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to send reply', description: err.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    sendMutation.mutate();
  };

  // Determine whether a reply was sent by the current user
  const isSenderOf = (reply: (typeof replies)[number]): boolean => {
    if (isWLLane) {
      // No author_id on WL replies — infer from author_type
      if (WL_PARTNER_ROLES.has(currentUserRole ?? '')) {
        return reply.author_type === 'partner';
      }
      return reply.author_type === 'client';
    }
    return reply.author_id === currentUserId;
  };

  return (
    <div className={className}>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-3/4" />
          <Skeleton className="h-16 w-2/3 ml-auto" />
          <Skeleton className="h-16 w-3/4" />
        </div>
      ) : replies.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No messages yet.</p>
      ) : (
        <div className="space-y-3">
          {replies.map((reply) => (
            <ChatMessage
              key={reply.id}
              authorName={reply.author_name}
              authorId={reply.author_id}
              message={reply.message}
              createdAt={reply.created_at}
              isInternal={reply.is_internal}
              isSender={isSenderOf(reply)}
            />
          ))}
        </div>
      )}

      <div ref={repliesEndRef} />

      <Separator className="my-4" />

      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Type a message…"
          rows={3}
        />
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {showInternalToggle && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="ticket-thread-internal"
                checked={isInternal}
                onCheckedChange={(v) => setIsInternal(v === true)}
              />
              <Label htmlFor="ticket-thread-internal" className="text-sm text-muted-foreground">
                Internal note (not visible to submitter)
              </Label>
            </div>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={!replyText.trim() || sendMutation.isPending}
            className={showInternalToggle ? '' : 'ml-auto'}
          >
            <Send className="h-4 w-4 mr-2" />
            {sendMutation.isPending ? 'Sending…' : 'Send Message'}
          </Button>
        </div>
      </form>
    </div>
  );
}
