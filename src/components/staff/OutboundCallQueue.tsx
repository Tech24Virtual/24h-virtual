import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PhoneOutgoing, Clock, Copy, User, AlertTriangle, RotateCcw, Check, X, PhoneCall } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeOutboundRequests } from '@/hooks/useRealtimeOutboundRequests';
import { LogAttemptDialog } from './LogAttemptDialog';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OutboundCallQueueProps {
  role: 'agent' | 'supervisor' | 'admin';
}

const statusFilters = ['all', 'pending', 'retry_pending', 'in_progress', 'completed', 'failed'] as const;

export function OutboundCallQueue({ role }: OutboundCallQueueProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [attemptDialog, setAttemptDialog] = useState<{
    open: boolean;
    request: { id: string; contact_name: string; attempt_count: number; max_attempts: number } | null;
  }>({ open: false, request: null });

  useRealtimeOutboundRequests();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['outbound-requests', activeTab],
    queryFn: async () => {
      let query = supabase
        .from('outbound_call_requests')
        .select('*, leads(name, company)')
        .order('created_at', { ascending: false });

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Sort: urgent first, then retry_due, then by created_at
      return (data || []).sort((a, b) => {
        // Urgent first
        if (a.urgency === 'urgent' && b.urgency !== 'urgent') return -1;
        if (b.urgency === 'urgent' && a.urgency !== 'urgent') return 1;
        // Retry due (past next_retry_at) second
        const now = new Date();
        const aRetryDue = a.status === 'retry_pending' && a.next_retry_at && new Date(a.next_retry_at) <= now;
        const bRetryDue = b.status === 'retry_pending' && b.next_retry_at && new Date(b.next_retry_at) <= now;
        if (aRetryDue && !bRetryDue) return -1;
        if (bRetryDue && !aRetryDue) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['outbound-stats'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('outbound_call_requests')
        .select('status, claimed_by, completed_at, next_retry_at');
      if (error) throw error;

      const now = new Date();
      return {
        pending: (data || []).filter(r => r.status === 'pending').length,
        myActive: (data || []).filter(r => r.claimed_by === user?.id && ['claimed', 'in_progress', 'retry_pending'].includes(r.status)).length,
        retryDue: (data || []).filter(r => r.status === 'retry_pending' && r.next_retry_at && new Date(r.next_retry_at) <= now).length,
        completedToday: (data || []).filter(r => r.status === 'completed' && r.completed_at && new Date(r.completed_at) >= today).length,
      };
    },
  });

  const claimMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('outbound_call_requests')
        .update({
          status: 'claimed',
          claimed_by: user!.id,
          claimed_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound-requests'] });
      queryClient.invalidateQueries({ queryKey: ['outbound-stats'] });
      toast.success('Request claimed');
    },
    onError: () => toast.error('Failed to claim request'),
  });

  const startCallMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('outbound_call_requests')
        .update({ status: 'in_progress' })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound-requests'] });
      toast.success('Marked as in progress');
    },
  });

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    toast.success('Phone number copied');
  };

  const isRetryDue = (req: typeof requests[0]) => {
    return req.status === 'retry_pending' && req.next_retry_at && new Date(req.next_retry_at) <= new Date();
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats?.pending ?? 0}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats?.myActive ?? 0}</p>
            <p className="text-xs text-muted-foreground">My Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats?.retryDue ?? 0}</p>
            <p className="text-xs text-muted-foreground">Retry Due</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats?.completedToday ?? 0}</p>
            <p className="text-xs text-muted-foreground">Completed Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          {statusFilters.map((f) => (
            <TabsTrigger key={f} value={f} className="capitalize">
              {f === 'retry_pending' ? 'Retry Due' : f}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Queue */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <PhoneOutgoing className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No requests in this queue</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const retryDue = isRetryDue(req);
            const leadInfo = req.leads as { name: string; company: string } | null;
            const canClaim = req.status === 'pending';
            const canLog = ['claimed', 'in_progress', 'retry_pending'].includes(req.status) &&
              (req.claimed_by === user?.id || role === 'supervisor' || role === 'admin');
            const canStart = req.status === 'claimed' && req.claimed_by === user?.id;

            return (
              <Card
                key={req.id}
                className={cn(
                  'transition-all',
                  retryDue && 'border-primary/50 shadow-sm',
                  req.urgency === 'urgent' && req.status !== 'completed' && req.status !== 'failed' && 'border-destructive/40'
                )}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Client info */}
                      {leadInfo && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span>{leadInfo.name}{leadInfo.company ? ` — ${leadInfo.company}` : ''}</span>
                        </div>
                      )}

                      {/* Contact info */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{req.contact_name}</h3>
                        {req.urgency === 'urgent' && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Urgent
                          </Badge>
                        )}
                        {retryDue && (
                          <Badge variant="default" className="gap-1 animate-pulse">
                            <RotateCcw className="w-3 h-3" />
                            Retry Due
                          </Badge>
                        )}
                        {req.status === 'retry_pending' && !retryDue && (
                          <Badge variant="outline" className="gap-1">
                            <Clock className="w-3 h-3" />
                            Retry {req.next_retry_at ? formatDistanceToNow(new Date(req.next_retry_at), { addSuffix: true }) : 'scheduled'}
                          </Badge>
                        )}
                        {['completed', 'failed', 'cancelled'].includes(req.status) && (
                          <Badge variant={req.status === 'completed' ? 'default' : 'destructive'}>
                            {req.status === 'completed' ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                            {req.status}
                          </Badge>
                        )}
                      </div>

                      {/* Phone */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-muted-foreground">{req.contact_phone}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyPhone(req.contact_phone)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* Reason */}
                      {req.reason && (
                        <p className="text-sm text-muted-foreground">{req.reason}</p>
                      )}

                      {/* Meta */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span>{formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</span>
                        {req.attempt_count > 0 && <span>Attempt {req.attempt_count}/{req.max_attempts}</span>}
                        <Badge variant="outline" className="text-xs">{req.source}</Badge>
                      </div>

                      {/* Outcome notes */}
                      {req.outcome_notes && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm">{req.outcome_notes}</div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-row sm:flex-col gap-2">
                      {canClaim && (
                        <Button
                          size="sm"
                          onClick={() => claimMutation.mutate(req.id)}
                          disabled={claimMutation.isPending}
                        >
                          Claim
                        </Button>
                      )}
                      {canStart && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startCallMutation.mutate(req.id)}
                        >
                          <PhoneCall className="w-4 h-4 mr-1" />
                          Call Now
                        </Button>
                      )}
                      {canLog && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAttemptDialog({
                            open: true,
                            request: {
                              id: req.id,
                              contact_name: req.contact_name,
                              attempt_count: req.attempt_count,
                              max_attempts: req.max_attempts,
                            },
                          })}
                        >
                          Log Attempt
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {attemptDialog.request && (
        <LogAttemptDialog
          open={attemptDialog.open}
          onClose={() => setAttemptDialog({ open: false, request: null })}
          request={attemptDialog.request}
        />
      )}
    </div>
  );
}
