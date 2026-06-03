import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseRealtimeWLTicketsOptions {
  partnerId?: string;
  wlClientId?: string;
  onUpdate?: () => void;
  showNotifications?: boolean;
}

export function useRealtimeWLTickets(options: UseRealtimeWLTicketsOptions = {}) {
  const { partnerId, wlClientId, onUpdate, showNotifications = true } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!partnerId && !wlClientId) return;

    const channelName = `wl-tickets-${partnerId || 'all'}-${wlClientId || 'all'}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wl_client_tickets',
        },
        (payload) => {
          const newRecord = payload.new as Record<string, unknown> | null;

          // Filter by partner/client scope
          if (partnerId && newRecord?.partner_id !== partnerId) return;
          if (wlClientId && newRecord?.wl_client_id !== wlClientId) return;

          queryClient.invalidateQueries({ queryKey: ['wl-tickets'] });
          onUpdate?.();

          if (payload.eventType === 'INSERT' && showNotifications) {
            toast({
              title: '🎫 New Client Ticket',
              description: `Ticket #${newRecord?.ticket_number || ''} received`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wl_client_ticket_replies',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['wl-ticket-replies'] });
          onUpdate?.();

          if (showNotifications) {
            const newReply = payload.new as Record<string, unknown>;
            // Don't notify for internal replies
            if (newReply?.is_internal) return;
            toast({
              title: 'New Reply',
              description: `${newReply?.author_name || 'Someone'} added a reply`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partnerId, wlClientId, showNotifications, queryClient, toast, onUpdate]);
}
