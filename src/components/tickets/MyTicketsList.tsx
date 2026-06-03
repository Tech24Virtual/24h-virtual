import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { MessageSquare, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PriorityBadge, StatusBadge } from './SourceBadge';

interface MyTicketsListProps {
  /** Link prefix for ticket details (e.g., '/client-dashboard/support') */
  detailLinkPrefix?: string;
  /** Which table to query. Defaults to 'support_tickets'. */
  sourceTable?: 'support_tickets' | 'wl_client_tickets';
}

interface NormalizedTicket {
  id: string;
  ticket_number: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  created_at: string;
}

export function MyTicketsList({ detailLinkPrefix, sourceTable = 'support_tickets' }: MyTicketsListProps) {
  const { user } = useAuth();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['my-tickets', user?.id, sourceTable],
    queryFn: async (): Promise<NormalizedTicket[]> => {
      if (sourceTable === 'wl_client_tickets') {
        // Resolve the partner_id for the current user first
        const { data: partner } = await supabase
          .from('white_label_partners')
          .select('id')
          .eq('user_id', user!.id)
          .maybeSingle();
        console.log('partner lookup:', partner);
        if (!partner) return [];

        const { data, error } = await supabase
          .from('wl_client_tickets')
          .select('id, ticket_number, subject, description, status, priority, created_at')
          .eq('partner_id', partner.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        console.log('tickets fetched:', data);

        return (data ?? []).map((t) => ({
          id: t.id,
          ticket_number: t.ticket_number,
          title: t.subject,
          description: t.description,
          status: t.status,
          priority: t.priority,
          created_at: t.created_at,
        }));
      }

      // Default: support_tickets
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, ticket_number, title, description, status, priority, created_at')
        .eq('submitted_by', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      return (data ?? []).map((t) => ({
        id: t.id,
        ticket_number: t.ticket_number,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        created_at: t.created_at,
      }));
    },
    enabled: !!user?.id,
  });

  // Fetch reply counts (only for support_tickets; wl_client_ticket_replies lacks a cross-table count shortcut)
  const { data: replyCounts = {} } = useQuery({
    queryKey: ['ticket-reply-counts', tickets.map((t) => t.id), sourceTable],
    queryFn: async () => {
      if (tickets.length === 0) return {};
      const replyTable = sourceTable === 'wl_client_tickets' ? 'wl_client_ticket_replies' : 'ticket_replies';
      const counts: Record<string, number> = {};
      const { data, error } = await supabase
        .from(replyTable as 'ticket_replies')
        .select('ticket_id')
        .in('ticket_id', tickets.map((t) => t.id))
        .eq('is_internal', false);
      if (error) throw error;
      data?.forEach((reply) => {
        counts[reply.ticket_id] = (counts[reply.ticket_id] || 0) + 1;
      });
      return counts;
    },
    enabled: tickets.length > 0,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <Ticket className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
        <p className="text-lg font-medium text-muted-foreground">No tickets yet</p>
        <p className="text-sm text-muted-foreground/70">
          Submit a ticket to get help from our team
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((ticket) => {
        const replyCount = replyCounts[ticket.id] || 0;

        return (
          <Card key={ticket.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono text-muted-foreground">
                      #{ticket.ticket_number}
                    </span>
                    <PriorityBadge priority={ticket.priority} />
                    <StatusBadge status={ticket.status} />
                  </div>

                  {detailLinkPrefix ? (
                    <Link
                      to={`${detailLinkPrefix}/${ticket.id}`}
                      className="font-medium hover:text-primary transition-colors line-clamp-1"
                    >
                      {ticket.title}
                    </Link>
                  ) : (
                    <p className="font-medium line-clamp-1">{ticket.title}</p>
                  )}

                  <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                    {ticket.description}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground whitespace-nowrap">
                  <span>{format(new Date(ticket.created_at), 'MMM d, yyyy')}</span>
                  {replyCount > 0 && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {replyCount}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
