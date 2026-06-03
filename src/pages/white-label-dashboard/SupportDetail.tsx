import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { WhiteLabelLayout } from '@/components/white-label/WhiteLabelLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PriorityBadge, StatusBadge, TicketThread } from '@/components/tickets';

export default function WLSupportDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['wl-support-ticket', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, ticket_number, title, description, priority, status, created_at, submitter_name, submitter_email')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <WhiteLabelLayout>
        <div className="space-y-4 max-w-3xl">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </WhiteLabelLayout>
    );
  }

  if (!ticket) {
    return (
      <WhiteLabelLayout>
        <div className="max-w-3xl space-y-4">
          <Link
            to="/white-label-dashboard/account/support"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Support
          </Link>
          <p className="text-muted-foreground">Ticket not found.</p>
        </div>
      </WhiteLabelLayout>
    );
  }

  return (
    <WhiteLabelLayout>
      <div className="space-y-6 max-w-3xl">

        <Link
          to="/white-label-dashboard/account/support"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Support
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-mono text-muted-foreground mb-1">
                  #{ticket.ticket_number}
                </p>
                <CardTitle className="text-xl leading-snug">{ticket.title}</CardTitle>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                <PriorityBadge priority={ticket.priority} />
                <StatusBadge status={ticket.status} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {ticket.description && (
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {ticket.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-4">
              Submitted {format(new Date(ticket.created_at), 'PPP')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <TicketThread
              ticketId={id!}
              sourceTable="support_tickets"
              currentUserId={user?.id ?? ''}
              className="mt-4"
            />
          </CardContent>
        </Card>

      </div>
    </WhiteLabelLayout>
  );
}
