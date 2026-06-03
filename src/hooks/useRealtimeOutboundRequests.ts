import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export function useRealtimeOutboundRequests() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const channel = supabase
      .channel('outbound-call-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'outbound_call_requests',
        },
        (payload) => {
          const newRecord = payload.new as Record<string, unknown> | null;

          // Invalidate all related queries
          queryClient.invalidateQueries({ queryKey: ['outbound-requests'] });
          queryClient.invalidateQueries({ queryKey: ['client-outbound-requests'] });
          queryClient.invalidateQueries({ queryKey: ['outbound-stats'] });

          if (payload.eventType === 'INSERT') {
            // Don't notify the client who created the request
            if (newRecord?.client_id !== user?.id) {
              toast({
                title: newRecord?.urgency === 'urgent'
                  ? '🔴 Urgent Outbound Call Request'
                  : '📞 New Outbound Call Request',
                description: `Call ${newRecord?.contact_name} at ${newRecord?.contact_phone}`,
              });
            }
          }

          if (payload.eventType === 'UPDATE') {
            const oldRecord = payload.old as Record<string, unknown>;
            if (oldRecord?.status !== newRecord?.status && newRecord?.status === 'retry_pending') {
              if (newRecord?.claimed_by === user?.id) {
                toast({
                  title: '🔁 Retry Due',
                  description: `Retry due for ${newRecord?.contact_name}`,
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast, user?.id]);
}
