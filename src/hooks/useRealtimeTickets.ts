import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isMockMode } from '@/lib/mockMode';

interface UseRealtimeTicketsOptions {
  sourceFilter?: string;
  workQueueFilter?: string;
  categoryFilter?: string;
  showNotifications?: boolean;
}

export function useRealtimeTickets(options: UseRealtimeTicketsOptions = {}) {
  const { sourceFilter, workQueueFilter, categoryFilter, showNotifications = true } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (isMockMode()) return;
    // Build a unique channel name based on filters
    const channelName = `tickets-${workQueueFilter || sourceFilter || 'all'}-${categoryFilter || 'all'}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
        },
        (payload) => {
          // Check if the change matches our filters
          const newRecord = payload.new as Record<string, unknown> | null;
          
          // Check both work_queue/source for proper filtering
          if (workQueueFilter) {
            if (newRecord?.work_queue !== workQueueFilter) return;
          } else if (sourceFilter) {
            if (newRecord?.source !== sourceFilter) return;
          }

          // Invalidate ticket queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['tickets'] });
          queryClient.invalidateQueries({ queryKey: ['admin-ticket-stats'] });
          queryClient.invalidateQueries({ queryKey: ['ticket-views'] });
          queryClient.invalidateQueries({ queryKey: ['created-tickets'] });

          // Show notification for new tickets
          if (payload.eventType === 'INSERT' && showNotifications) {
            toast({
              title: '🎫 New Ticket',
              description: `Ticket #${(newRecord as Record<string, unknown>)?.ticket_number || ''} received`,
            });
          }

          // Show notification for status changes
          if (payload.eventType === 'UPDATE' && showNotifications) {
            const oldRecord = payload.old as Record<string, unknown>;
            if (oldRecord?.status !== newRecord?.status) {
              toast({
                title: 'Ticket Updated',
                description: `Status changed to ${newRecord?.status}`,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sourceFilter, workQueueFilter, categoryFilter, showNotifications, queryClient, toast]);
}

interface UseRealtimeTicketRepliesOptions {
  ticketId: string;
  onNewReply?: () => void;
}

export function useRealtimeTicketReplies({ ticketId, onNewReply }: UseRealtimeTicketRepliesOptions) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`ticket-replies-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_replies',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          // Invalidate replies query
          queryClient.invalidateQueries({ queryKey: ['ticket-replies', ticketId] });
          
          const newReply = payload.new as Record<string, unknown>;
          toast({
            title: 'New Reply',
            description: `${newReply?.author_name || 'Someone'} added a reply`,
          });

          onNewReply?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, queryClient, toast, onNewReply]);
}
