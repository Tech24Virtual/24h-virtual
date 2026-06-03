import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Send, User } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SourceBadge, PriorityBadge, StatusBadge, OriginBadge } from './SourceBadge';
import { StaffAssignmentSelect } from './StaffAssignmentSelect';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useRealtimeTicketReplies } from '@/hooks/useRealtimeTickets';

interface TicketDetailViewProps {
  ticketId?: string;
  backLink?: string;
  canManage?: boolean;
  viewContext?: string;
}

export function TicketDetailView({ 
  ticketId: propTicketId, 
  backLink = '/admin/tickets',
  canManage = true,
  viewContext = 'default',
}: TicketDetailViewProps) {
  const { id: paramId } = useParams();
  const ticketId = propTicketId || paramId;
  const { user, profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const repliesEndRef = useRef<HTMLDivElement>(null);
  
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');

  // Enable real-time replies
  useRealtimeTicketReplies({
    ticketId: ticketId || '',
    onNewReply: () => {
      // Scroll to new reply
      setTimeout(() => {
        repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },
  });

  // Upsert ticket_views to mark this ticket as viewed in the current context
  useEffect(() => {
    if (!ticketId || !user?.id) return;
    const upsertView = async () => {
      await supabase
        .from('ticket_views')
        .upsert(
          { user_id: user.id, ticket_id: ticketId, view_context: viewContext, last_viewed_at: new Date().toISOString() },
          { onConflict: 'user_id,ticket_id,view_context' }
        );
      // Invalidate ticket-views to clear highlighting in list
      queryClient.invalidateQueries({ queryKey: ['ticket-views'] });
    };
    upsertView();
  }, [ticketId, user?.id, viewContext, queryClient]);

  // Fetch ticket details
  const { data: ticket, isLoading: ticketLoading } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });

  // Fetch replies
  const { data: replies = [], isLoading: repliesLoading } = useQuery({
    queryKey: ['ticket-replies', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_replies')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });

  // Auto-scroll to bottom when replies load
  useEffect(() => {
    if (replies.length > 0) {
      repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [replies.length]);

  // Add reply mutation
  const addReplyMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('ticket_replies').insert({
        ticket_id: ticketId,
        message: replyMessage.trim(),
        author_id: user?.id,
        author_name: profile?.full_name || user?.email,
        is_internal: isInternal,
      });
      if (error) throw error;

      // Send email notification if not internal
      if (!isInternal && ticket?.submitter_email) {
        try {
          await supabase.functions.invoke('send-ticket-notification', {
            body: {
              type: 'ticket_reply',
              ticketId: ticketId,
              ticketNumber: ticket.ticket_number,
              ticketTitle: ticket.title,
              replyMessage: replyMessage.trim(),
              replierName: profile?.full_name || user?.email || 'Support Team',
              submitterEmail: ticket.submitter_email,
              submitterName: ticket.submitter_name,
            },
          });
        } catch (emailError) {
          console.error('Failed to send reply notification email:', emailError);
        }
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-replies', ticketId] });
      setReplyMessage('');
      setIsInternal(false);
      toast({ title: 'Reply added' });
      // Upsert ticket_views for current context to prevent self-highlighting
      if (user?.id && ticketId) {
        await supabase
          .from('ticket_views')
          .upsert(
            { user_id: user.id, ticket_id: ticketId, view_context: viewContext, last_viewed_at: new Date().toISOString() },
            { onConflict: 'user_id,ticket_id,view_context' }
          );
        queryClient.invalidateQueries({ queryKey: ['ticket-views'] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error adding reply',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'resolved' || status === 'closed') {
        updates.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      toast({ title: 'Status updated' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    addReplyMutation.mutate();
  };

  const handleStatusChange = (status: string) => {
    setNewStatus(status);
    updateStatusMutation.mutate(status);
  };

  if (ticketLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Ticket not found</p>
        <Button variant="link" asChild>
          <Link to={backLink}>Go back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" asChild>
          <Link to={backLink}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm text-muted-foreground font-mono">
              #{ticket.ticket_number}
            </span>
            <SourceBadge source={ticket.source} />
            <OriginBadge originatingSource={ticket.originating_source} currentSource={ticket.source} />
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
          <h1 className="text-2xl font-bold">{ticket.title}</h1>
        </div>
        {canManage && (
          <Select value={newStatus || ticket.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="waiting">Waiting</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Assignment Section */}
      {canManage && (
        <Card className="p-4">
          <StaffAssignmentSelect
            ticketId={ticket.id}
            currentAssignee={ticket.assigned_to}
            ticketNumber={ticket.ticket_number}
            ticketTitle={ticket.title}
          />
        </Card>
      )}

      {/* Conversation Thread */}
      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Original ticket description as first message */}
          <ChatMessage
            authorName={ticket.submitter_name || ticket.submitter_email || 'Unknown'}
            authorId={ticket.submitted_by}
            message={ticket.description + (ticket.category ? `\n\nCategory: ${ticket.category.replace('_', ' ')}` : '')}
            createdAt={ticket.created_at}
            isSender={ticket.submitted_by === user?.id}
          />

          {repliesLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            replies.map((reply) => (
              <ChatMessage
                key={reply.id}
                authorName={reply.author_name}
                authorId={reply.author_id}
                message={reply.message}
                createdAt={reply.created_at}
                isInternal={reply.is_internal ?? false}
                isSender={reply.author_id === user?.id}
              />
            ))
          )}
          <div ref={repliesEndRef} />

          {/* Reply Form */}
          <form onSubmit={handleSubmitReply} className="space-y-3 pt-4 border-t">
            <Textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Type your reply..."
              rows={3}
            />
            <div className="flex items-center justify-between">
              {(isAdmin || canManage) && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="internal"
                    checked={isInternal}
                    onCheckedChange={(checked) => setIsInternal(checked === true)}
                  />
                  <Label htmlFor="internal" className="text-sm text-muted-foreground">
                    Internal note (not visible to submitter)
                  </Label>
                </div>
              )}
              <Button 
                type="submit" 
                disabled={!replyMessage.trim() || addReplyMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                {addReplyMutation.isPending ? 'Sending...' : 'Send Reply'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
