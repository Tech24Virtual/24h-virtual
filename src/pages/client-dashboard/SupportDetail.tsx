import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TicketThread } from '@/components/tickets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ClientSupportDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['client-support-ticket', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, ticket_number, title, status, priority, created_at')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) return <div className="p-6"><Skeleton className="h-32 w-full" /></div>;
  if (!ticket) return <div className="p-6 text-muted-foreground">Ticket not found.</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Link
        to="/client-dashboard/support"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Support
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            #{ticket.ticket_number} — {ticket.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TicketThread
            ticketId={id!}
            sourceTable="support_tickets"
            currentUserId={user?.id ?? ''}
          />
        </CardContent>
      </Card>
    </div>
  );
}
