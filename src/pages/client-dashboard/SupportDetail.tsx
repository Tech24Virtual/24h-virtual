import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TicketThread } from '@/components/tickets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

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
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <DashboardLayout title="Support Ticket">
        <Skeleton className="h-32 w-full" />
      </DashboardLayout>
    );
  }

  if (!ticket) {
    return (
      <DashboardLayout title="Support Ticket">
        <div className="text-muted-foreground">Ticket not found.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="rounded-2xl border border-border p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 mb-6">
        <h1 className="text-2xl font-bold text-heading">Support Ticket</h1>
        <p className="text-muted-foreground mt-0.5">
          #{ticket.ticket_number} — {ticket.title}
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
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
    </DashboardLayout>
  );
}
