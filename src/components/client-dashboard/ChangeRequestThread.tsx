import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Comment {
  id: string;
  author_id: string | null;
  author_name: string;
  message: string;
  created_at: string;
}

interface ChangeRequest {
  id: string;
  title: string;
  description: string | null;
  request_type: string;
  status: string;
  proposed_changes: Record<string, unknown>;
  reviewer_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

interface ChangeRequestThreadProps {
  request: ChangeRequest;
  onStatusChange?: () => void;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  in_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  needs_info: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const typeLabels: Record<string, string> = {
  greeting_change: 'Greeting Change',
  faq_update: 'FAQ Update',
  new_faq: 'New FAQ',
  remove_faq: 'Remove FAQ',
  call_rules: 'Call Handling Rules',
  full_script: 'Full Script Update',
  other: 'Other',
};

export function ChangeRequestThread({ request, onStatusChange }: ChangeRequestThreadProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchComments();

    const channel = supabase
      .channel(`comments-${request.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'script_change_comments',
        filter: `request_id=eq.${request.id}`,
      }, () => fetchComments())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [request.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('script_change_comments')
      .select('*')
      .eq('request_id', request.id)
      .order('created_at', { ascending: true });

    if (!error && data) setComments(data);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;

    setIsSending(true);
    try {
      const { error } = await supabase.from('script_change_comments').insert({
        request_id: request.id,
        author_id: user.id,
        author_name: user.email?.split('@')[0] || 'Client',
        message: newMessage.trim(),
      });

      if (error) throw error;
      setNewMessage('');
      await fetchComments();
    } catch {
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const isResolved = request.status === 'approved' || request.status === 'rejected';

  return (
    <div className="space-y-4">
      {/* Request header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={statusColors[request.status] || ''}>
            {request.status.replace('_', ' ').toUpperCase()}
          </Badge>
          <Badge variant="outline">{typeLabels[request.request_type] || request.request_type}</Badge>
          <span className="text-xs text-muted-foreground">
            {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
          </span>
        </div>
        {request.description && (
          <p className="text-sm text-muted-foreground">{request.description}</p>
        )}
        {request.reviewer_notes && (
          <div className="p-3 rounded-lg bg-muted text-sm">
            <p className="text-xs font-medium mb-1">Supervisor Notes:</p>
            <p>{request.reviewer_notes}</p>
          </div>
        )}
      </div>

      {/* Comments thread */}
      <div
        ref={scrollRef}
        className="space-y-3 max-h-60 overflow-y-auto border rounded-lg p-3"
      >
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No messages yet. {!isResolved && 'Start the conversation below.'}
          </p>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className={`flex flex-col ${c.author_id === user?.id ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 text-sm ${
                  c.author_id === user?.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="font-medium text-xs mb-1">{c.author_name}</p>
                <p className="whitespace-pre-wrap">{c.message}</p>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1">
                {format(new Date(c.created_at), 'MMM d, h:mm a')}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Reply box */}
      {!isResolved && (
        <div className="flex gap-2">
          <Textarea
            placeholder="Type a message..."
            rows={2}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            className="flex-1"
          />
          <Button size="icon" onClick={handleSend} disabled={isSending || !newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
