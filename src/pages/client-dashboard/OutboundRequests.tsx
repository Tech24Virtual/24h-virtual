import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PhoneOutgoing, Clock, CheckCircle, XCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { OutboundCallRequestDialog } from '@/components/client-dashboard/OutboundCallRequestDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  pending: { label: 'Pending', variant: 'secondary', icon: Clock },
  claimed: { label: 'Claimed', variant: 'outline', icon: PhoneOutgoing },
  in_progress: { label: 'In Progress', variant: 'default', icon: PhoneOutgoing },
  retry_pending: { label: 'Retry Scheduled', variant: 'outline', icon: RotateCcw },
  completed: { label: 'Completed', variant: 'default', icon: CheckCircle },
  failed: { label: 'Failed', variant: 'destructive', icon: XCircle },
  cancelled: { label: 'Cancelled', variant: 'secondary', icon: XCircle },
};

export default function OutboundRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['client-outbound-requests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outbound_call_requests')
        .select('*')
        .eq('client_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const cancelMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('outbound_call_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)
        .eq('client_id', user!.id)
        .eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-outbound-requests'] });
      toast.success('Request cancelled');
    },
    onError: () => toast.error('Failed to cancel request'),
  });

  // Realtime subscription — update status without manual refresh
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('client-outbound-requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'outbound_call_requests' },
        () => queryClient.invalidateQueries({ queryKey: ['client-outbound-requests', user.id] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const handleDialogClose = (saved: boolean) => {
    setDialogOpen(false);
    if (saved) queryClient.invalidateQueries({ queryKey: ['client-outbound-requests'] });
  };

  return (
    <DashboardLayout>
      <div className="rounded-2xl border border-border p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 mb-6">
        <h1 className="text-2xl font-bold text-heading">Outbound Call Requests</h1>
        <p className="text-muted-foreground mt-0.5">Track your outbound call requests and their status</p>
      </div>
      <div className="flex justify-end mb-6">
        <Button onClick={() => setDialogOpen(true)}>
          <PhoneOutgoing className="w-4 h-4 mr-2" />
          New Request
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PhoneOutgoing className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No outbound call requests yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Submit a request and our team will make the call for you
            </p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              Submit Your First Request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const config = statusConfig[req.status] || statusConfig.pending;
            const StatusIcon = config.icon;

            return (
              <Card key={req.id}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{req.contact_name}</h3>
                        <Badge variant={config.variant} className="gap-1">
                          <StatusIcon className="w-3 h-3" />
                          {config.label}
                        </Badge>
                        {req.urgency === 'urgent' && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{req.contact_phone}</p>
                      {req.reason && (
                        <p className="text-sm text-muted-foreground">{req.reason}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Submitted {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</span>
                        {req.attempt_count > 0 && (
                          <span>Attempt {req.attempt_count} of {req.max_attempts}</span>
                        )}
                      </div>
                      {req.outcome_notes && (
                        <div className="mt-2 p-3 bg-muted rounded-md">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Agent Notes:</p>
                          <p className="text-sm">{req.outcome_notes}</p>
                        </div>
                      )}
                    </div>
                    {req.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelMutation.mutate(req.id)}
                        disabled={cancelMutation.isPending}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <OutboundCallRequestDialog open={dialogOpen} onClose={handleDialogClose} />
    </DashboardLayout>
  );
}
