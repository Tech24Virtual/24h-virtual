import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeTicketReplies } from '@/hooks/useRealtimeTickets';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Props {
  ticketId: string | null;
}

export function WorkspaceTicketDetail({ ticketId }: Props) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useRealtimeTicketReplies({ ticketId: ticketId || '', onNewReply: () => setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100) });

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase.from('support_tickets').select('*').eq('id', ticketId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });

  const { data: replies = [] } = useQuery({
    queryKey: ['ticket-replies', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_replies')
        .select('*')
        .eq('ticket_id', ticketId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [replies.length]);

  const replyMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('ticket_replies').insert({
        ticket_id: ticketId,
        message: reply.trim(),
        author_id: user?.id,
        author_name: profile?.full_name || user?.email,
        is_internal: internal,
      });
      if (error) throw error;
      if (!internal && ticket?.submitter_email) {
        try {
          await supabase.functions.invoke('send-ticket-notification', {
            body: {
              type: 'ticket_reply',
              ticketId,
              ticketNumber: ticket.ticket_number,
              ticketTitle: ticket.title,
              replyMessage: reply.trim(),
              replierName: profile?.full_name || user?.email || 'Support Team',
              submitterEmail: ticket.submitter_email,
              submitterName: ticket.submitter_name,
            },
          });
        } catch (e) { console.error(e); }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-replies', ticketId] });
      setReply(''); setInternal(false);
      toast({ title: 'Reply sent' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const updates: any = { status };
      if (status === 'resolved' || status === 'closed') updates.resolved_at = new Date().toISOString();
      const { error } = await supabase.from('support_tickets').update(updates).eq('id', ticketId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-tickets'] });
    },
  });

  if (!ticketId) {
    return <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Select a ticket</div>;
  }

  if (isLoading || !ticket) {
    return <div className="flex-1 p-4 space-y-3"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-32 w-full" /></div>;
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div className="px-3 py-2 border-b shrink-0 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">#{ticket.ticket_number}</span>
            <Badge variant="outline" className="text-[10px] capitalize">{ticket.priority}</Badge>
            <Badge variant="outline" className="text-[10px] capitalize">{ticket.status}</Badge>
          </div>
          <h2 className="text-sm font-semibold truncate mt-0.5">{ticket.title}</h2>
        </div>
        <Select value={ticket.status} onValueChange={(v) => statusMutation.mutate(v)}>
          <SelectTrigger className="w-[130px] h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          <Bubble
            author={ticket.submitter_name || ticket.submitter_email || 'Submitter'}
            createdAt={ticket.created_at}
            message={ticket.description || ''}
          />
          {replies.map((r) => (
            <Bubble
              key={r.id}
              author={r.author_name || 'Staff'}
              createdAt={r.created_at}
              message={r.message}
              isMine={r.author_id === user?.id}
              isInternal={r.is_internal ?? false}
            />
          ))}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      <div className="border-t p-2 shrink-0 space-y-2">
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Reply..."
          rows={2}
          className="resize-none text-sm"
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Checkbox id="ws-int" checked={internal} onCheckedChange={(c) => setInternal(c === true)} />
            <Label htmlFor="ws-int" className="text-xs text-muted-foreground">Internal note</Label>
          </div>
          <Button
            size="sm"
            disabled={!reply.trim() || replyMutation.isPending}
            onClick={() => replyMutation.mutate()}
          >
            <Send className="h-3 w-3 mr-1" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ author, createdAt, message, isMine, isInternal }: {
  author: string; createdAt: string; message: string; isMine?: boolean; isInternal?: boolean;
}) {
  return (
    <div className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-3 py-2 text-sm',
          isInternal ? 'bg-yellow-500/10 border border-yellow-500/30' : isMine ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        <div className="flex items-center justify-between gap-3 mb-0.5">
          <p className="text-[10px] opacity-70 font-medium">{author}{isInternal && ' · internal'}</p>
          <p className="text-[10px] opacity-60">{format(new Date(createdAt), 'MMM d, h:mm a')}</p>
        </div>
        <p className="whitespace-pre-wrap">{message}</p>
      </div>
    </div>
  );
}
