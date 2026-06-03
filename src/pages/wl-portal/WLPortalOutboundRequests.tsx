import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PhoneOutgoing, Clock, CheckCircle, XCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WLPortalLayout } from '@/components/wl-portal/WLPortalLayout';
import { WLOutboundCallRequestDialog } from '@/components/wl-portal/WLOutboundCallRequestDialog';
import { supabase } from '@/integrations/supabase/client';
import { useWLPortal } from '@/contexts/WLPortalContext';
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

export default function WLPortalOutboundRequests() {
  const { clientInfo } = useWLPortal();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: requests = [], isLoading } = useQuery<any[]>({
    queryKey: ['wl-outbound-requests', clientInfo?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('outbound_call_requests')
        .select('*')
        .eq('wl_client_id', clientInfo!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!clientInfo,
  });

  const cancelMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('outbound_call_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)
        .eq('wl_client_id', clientInfo!.id)
        .eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wl-outbound-requests'] });
      toast.success('Request cancelled');
    },
    onError: () => toast.error('Failed to cancel request'),
  });

  const handleDialogClose = (saved: boolean) => {
    setDialogOpen(false);
    if (saved) queryClient.invalidateQueries({ queryKey: ['wl-outbound-requests'] });
  };

  return (
    <WLPortalLayout
      title="Outbound Call Requests"
      description="Track your outbound call requests and their status"
    >
      <div className="flex justify-end mb-6">
        <Button onClick={() => setDialogOpen(true)}>
          <PhoneOutgoing className="w-4 h-4 mr-2" />
          New Request
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
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

      <WLOutboundCallRequestDialog open={dialogOpen} onClose={handleDialogClose} />
    </WLPortalLayout>
  );
}
