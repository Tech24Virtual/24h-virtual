import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isMockMode } from '@/lib/mockMode';

interface UseRealtimeChatsOptions {
  showNotifications?: boolean;
}

export function useRealtimeChats(options: UseRealtimeChatsOptions = {}) {
  const { showNotifications = true } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (isMockMode()) return; // skip realtime in mock mode
    const channel = supabase
      .channel('chat-conversations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations' }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
        const newRec = payload.new as Record<string, unknown> | null;
        if (payload.eventType === 'INSERT' && showNotifications && newRec?.status === 'queued') {
          toast({ title: '💬 New chat queued', description: 'A visitor needs an agent' });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient, toast, showNotifications]);
}

export function useRealtimeChatMessages(conversationId: string | null) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!conversationId) return;
    if (isMockMode()) return;
    const channel = supabase
      .channel(`chat-messages-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['chat-messages', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, queryClient]);
}
