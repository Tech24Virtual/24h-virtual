import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { MessageSquare, Loader2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SourceBadge, PriorityBadge, StatusBadge, OriginBadge } from './SourceBadge';
import { TicketDetailDialog } from './TicketDetailDialog';
import { Badge } from '@/components/ui/badge';

interface CreatedTicketsListProps {
  /** The current department source to exclude (those already show in the main tab) */
  excludeSource: string;
  linkPrefix?: string;
}

type CreatedTicket = {
  id: string;
  ticket_number: number;
  title: string;
  priority: string;
  status: string;
  source: string;
  category: string | null;
  originating_source: string | null;
  submitter_name: string | null;
  submitter_email: string | null;
  created_at: string;
  last_activity_at: string | null;
  last_activity_by: string | null;
};

type TicketView = {
  ticket_id: string;
  last_viewed_at: string;
};

export function CreatedTicketsList({ excludeSource, linkPrefix }: CreatedTicketsListProps) {
  const { user } = useAuth();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['created-tickets', user?.id, excludeSource],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, ticket_number, title, priority, status, source, category, originating_source, submitter_name, submitter_email, created_at, last_activity_at, last_activity_by')
        .eq('submitted_by', user!.id)
        .neq('source', excludeSource)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as CreatedTicket[];
    },
    enabled: !!user?.id,
  });

  // Fetch user's ticket views for highlighting (using 'created' context)
  const ticketIds = tickets.map(t => t.id);
  const { data: ticketViews = [] } = useQuery({
    queryKey: ['ticket-views', user?.id, ticketIds, 'created'],
    queryFn: async () => {
      if (!user?.id || ticketIds.length === 0) return [];
      const { data, error } = await supabase
        .from('ticket_views')
        .select('ticket_id, last_viewed_at')
        .eq('user_id', user.id)
        .eq('view_context', 'created')
        .in('ticket_id', ticketIds);
      if (error) throw error;
      return data as TicketView[];
    },
    enabled: !!user?.id && ticketIds.length > 0,
  });

  const viewMap = useMemo(() => {
    const map: Record<string, string> = {};
    ticketViews.forEach(v => { map[v.ticket_id] = v.last_viewed_at; });
    return map;
  }, [ticketViews]);

  const isTicketHighlighted = useCallback((ticket: CreatedTicket): boolean => {
    if (!user?.id) return false;
    if (!ticket.last_activity_at) return false;

    const lastViewed = viewMap[ticket.id];
    if (!lastViewed) return true;
    return new Date(ticket.last_activity_at) > new Date(lastViewed);
  }, [user?.id, viewMap]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tickets.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Send className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No tickets created for other departments</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Send className="h-4 w-4" />
          Tickets You Created for Other Departments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const highlighted = isTicketHighlighted(ticket);

            return (
              <div
                key={ticket.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                  highlighted 
                    ? 'border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30' 
                    : 'bg-card hover:bg-accent/50'
                }`}
                onClick={() => {
                  setSelectedTicketId(ticket.id);
                  setDialogOpen(true);
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs text-muted-foreground font-mono">
                      #{ticket.ticket_number}
                    </span>
                    {highlighted && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0">
                        Updated
                      </Badge>
                    )}
                    <SourceBadge source={ticket.source} />
                    <OriginBadge originatingSource={ticket.originating_source} currentSource={ticket.source} />
                    <PriorityBadge priority={ticket.priority} />
                    <StatusBadge status={ticket.status} />
                  </div>
                  <h4 className="font-medium truncate">{ticket.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(ticket.created_at), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      <TicketDetailDialog
        ticketId={selectedTicketId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        canManage={false}
        viewContext="created"
      />
    </Card>
  );
}
