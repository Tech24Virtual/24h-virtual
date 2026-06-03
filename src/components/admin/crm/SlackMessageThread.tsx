import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { SlackMessageContent } from './SlackMessageContent';
import { EmojiPicker } from './EmojiPicker';
import { ScreenshotUpload } from './ScreenshotUpload';

interface SlackMessageThreadProps {
  channelId: string | null;
  channelName: string;
  currentUserSlackId: string | null;
}

export function SlackMessageThread({
  channelId,
  channelName,
  currentUserSlackId,
}: SlackMessageThreadProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['slack-messages', channelId],
    queryFn: async () => {
      if (!channelId) return [];
      const { data, error } = await supabase
        .from('slack_messages')
        .select('*')
        .eq('slack_channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) throw error;
      return data;
    },
    enabled: !!channelId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`slack-messages-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'slack_messages',
          filter: `slack_channel_id=eq.${channelId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['slack-messages', channelId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !channelId) return;
    setSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ channel_id: channelId, text: message }),
        }
      );
      const result = await resp.json();
      if (!resp.ok || result.error) {
        throw new Error(result.error || 'Failed to send');
      }
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['slack-messages', channelId] });
    } catch (err: any) {
      toast({
        title: 'Send failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  const handleImageUploaded = (url: string) => {
    // Append image markdown to message or send as standalone
    const imageText = `![Screenshot](${url})`;
    if (message.trim()) {
      setMessage((prev) => prev + '\n' + imageText);
    } else {
      setMessage(imageText);
    }
  };

  if (!channelId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Select a channel to start messaging
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <h3 className="font-semibold text-sm"># {channelName}</h3>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No messages yet</p>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isOwn = msg.is_from_crm || (currentUserSlackId && msg.slack_user_id === currentUserSlackId);
              return (
                <div
                  key={msg.id}
                  className={cn('flex flex-col max-w-[80%]', isOwn ? 'ml-auto items-end' : 'items-start')}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-foreground">
                      {msg.sender_name || msg.slack_user_id || 'Unknown'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                    </span>
                    {msg.is_from_crm && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">CRM</span>
                    )}
                  </div>
                  <div
                    className={cn(
                      'rounded-lg px-3 py-2 text-sm',
                      isOwn
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    )}
                  >
                    <SlackMessageContent text={msg.content} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Compose */}
      <div className="border-t p-3 relative">
        <div className="flex gap-2 items-end">
          <EmojiPicker onEmojiSelect={handleEmojiSelect} disabled={sending} />
          <ScreenshotUpload
            onImageUploaded={handleImageUploaded}
            disabled={sending}
            composerRef={textareaRef}
          />
          <Textarea
            ref={textareaRef}
            placeholder={`Message #${channelName}`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={sending}
            rows={1}
            className="min-h-[36px] max-h-[120px] resize-none flex-1"
          />
          <Button size="icon" onClick={handleSend} disabled={sending || !message.trim()} className="shrink-0">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
