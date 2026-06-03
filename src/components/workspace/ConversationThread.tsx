import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeChatMessages } from '@/hooks/useRealtimeChats';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Send, UserPlus, X, Ticket, ArrowUp, MoreHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { SubmitTicketDialog } from '@/components/tickets';
import { PinnedScriptBar, type PinnedScriptBarHandle } from './PinnedScriptBar';
import { useMockableQuery } from '@/hooks/useMockableQuery';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES_BY_CONV } from '@/lib/mockData';

export interface ConversationThreadHandle {
  assignToMe: () => Promise<void>;
  escalate: () => Promise<void>;
  close: () => Promise<void>;
  openCreateTicket: () => void;
}

interface Props {
  conversationId: string | null;
}

export const ConversationThread = forwardRef<ConversationThreadHandle, Props>(({ conversationId }, ref) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scriptBarRef = useRef<PinnedScriptBarHandle>(null);

  useRealtimeChatMessages(conversationId);

  const { data: convo } = useMockableQuery({
    queryKey: ['chat-conversation-detail', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const { data } = await supabase
        .from('chat_conversations')
        .select('*, chat_visitors(name, email, phone)')
        .eq('id', conversationId)
        .maybeSingle();
      return data;
    },
    enabled: !!conversationId,
    mockData: () => (conversationId ? MOCK_CONVERSATIONS.find(c => c.id === conversationId) ?? null : null) as any,
  });

  const { data: messages } = useMockableQuery({
    queryKey: ['chat-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      return data || [];
    },
    enabled: !!conversationId,
    mockData: () => (conversationId ? MOCK_MESSAGES_BY_CONV[conversationId] ?? [] : []) as any,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const newH = Math.min(ta.scrollHeight, 96); // ~4 rows
    ta.style.height = `${Math.max(newH, 32)}px`;
  }, [body]);

  const handleAssignToMe = async () => {
    if (!conversationId || !user) return;
    const { error } = await supabase
      .from('chat_conversations')
      .update({ assigned_agent_id: user.id, status: 'active' })
      .eq('id', conversationId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    await supabase.from('chat_assignments').insert({ conversation_id: conversationId, agent_id: user.id, assigned_by: user.id });
    queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    queryClient.invalidateQueries({ queryKey: ['chat-conversation-detail', conversationId] });
    toast({ title: 'Assigned', description: 'You are now handling this chat' });
  };

  const handleClose = async () => {
    if (!conversationId || !user) return;
    const { error } = await supabase
      .from('chat_conversations')
      .update({ status: 'closed', closed_at: new Date().toISOString(), closed_by: user.id })
      .eq('id', conversationId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    queryClient.invalidateQueries({ queryKey: ['chat-conversation-detail', conversationId] });
    toast({ title: 'Closed', description: 'Conversation closed' });
  };

  const handleEscalate = async () => {
    if (!conversationId) return;
    const { error } = await supabase
      .from('chat_conversations')
      .update({ status: 'queued', assigned_agent_id: null })
      .eq('id', conversationId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    toast({ title: 'Escalated', description: 'Sent back to queue for supervisor' });
  };

  const handleSend = async () => {
    if (!body.trim() || !conversationId) return;
    setSending(true);
    const { error } = await supabase.functions.invoke('chat-agent-send', {
      body: { conversation_id: conversationId, body: body.trim() },
    });
    setSending(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setBody('');
  };

  useImperativeHandle(ref, () => ({
    assignToMe: handleAssignToMe,
    escalate: handleEscalate,
    close: handleClose,
    openCreateTicket: () => setTicketDialogOpen(true),
  }));

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground bg-background">
        Select a conversation to begin
      </div>
    );
  }

  const isAssignedToMe = convo?.assigned_agent_id === user?.id;
  const isClosed = convo?.status === 'closed';
  const clientId = (convo as any)?.direct_client_id ?? null;

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
      <div className="px-3 h-9 border-b flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Badge variant={convo?.ownership_mode === 'wl' ? 'secondary' : 'default'} className="text-[10px] h-5">
            {convo?.ownership_mode === 'wl' ? 'WL' : 'Direct'}
          </Badge>
          <Badge variant="outline" className="capitalize text-[10px] h-5">{convo?.status}</Badge>
          {convo?.ai_state === 'active' && <Badge variant="outline" className="text-[10px] h-5">AI</Badge>}
        </div>
        <div className="flex gap-1 shrink-0">
          {!isAssignedToMe && !isClosed && (
            <Button size="sm" variant="default" className="h-6 px-2 text-xs" onClick={handleAssignToMe}>
              <UserPlus className="h-3 w-3 mr-1" /> Assign
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => setTicketDialogOpen(true)}>
            <Ticket className="h-3 w-3 mr-1" /> Ticket
          </Button>
          {isAssignedToMe && !isClosed && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={handleEscalate} className="text-xs">
                  <ArrowUp className="h-3 w-3 mr-1.5" /> Escalate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleClose} className="text-xs">
                  <X className="h-3 w-3 mr-1.5" /> Close
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-2" ref={scrollRef as any}>
        <div className="space-y-1.5">
          {messages?.map(m => (
            <div key={m.id} className={cn('flex', m.sender_type === 'agent' || m.sender_type === 'ai' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[78%] rounded-lg px-2.5 py-1.5 text-sm',
                  m.sender_type === 'agent' && 'bg-primary text-primary-foreground',
                  m.sender_type === 'ai' && 'bg-secondary',
                  m.sender_type === 'visitor' && 'bg-muted',
                  m.sender_type === 'system' && 'bg-accent text-xs italic mx-auto'
                )}
              >
                {m.sender_type !== 'visitor' && m.sender_type !== 'system' && (
                  <p className="text-[9px] opacity-70 mb-0.5 leading-none">{m.sender_name}</p>
                )}
                <p className="whitespace-pre-wrap leading-snug">{m.body}</p>
                <p className="text-[9px] opacity-60 mt-0.5 leading-none">{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <PinnedScriptBar ref={scriptBarRef} clientId={clientId} onInsert={(t) => setBody((b) => (b ? `${b}\n${t}` : t))} />

      {isAssignedToMe && !isClosed && (
        <>
          <div className="px-2 pt-1.5 pb-1 border-t flex gap-1.5 shrink-0 items-end">
            <Textarea
              ref={textareaRef}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Reply to visitor..."
              className="resize-none text-sm min-h-[32px] py-1.5 px-2 leading-snug"
              rows={1}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                else if (e.key === '/' && !body) { e.preventDefault(); scriptBarRef.current?.focusSearch(); }
              }}
            />
            <Button onClick={handleSend} disabled={sending || !body.trim()} size="icon" className="h-8 w-8 shrink-0">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="px-2 pb-1 shrink-0 flex items-center gap-2 text-[9px] text-muted-foreground">
            <span><kbd className="px-1 bg-muted rounded font-mono">⏎</kbd> Send</span>
            <span><kbd className="px-1 bg-muted rounded font-mono">⇧⏎</kbd> Newline</span>
            <span><kbd className="px-1 bg-muted rounded font-mono">/</kbd> Search scripts</span>
          </div>
        </>
      )}

      <SubmitTicketDialog
        open={ticketDialogOpen}
        onOpenChange={setTicketDialogOpen}
        source="agent"
        showAssignment
      />
    </div>
  );
});

ConversationThread.displayName = 'ConversationThread';
