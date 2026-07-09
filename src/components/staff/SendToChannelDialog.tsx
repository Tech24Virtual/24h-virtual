import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Send, Hash, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface ClientChannel {
  client_id: string;
  client_name: string;
  slack_channel_id: string;
  slack_channel_name: string | null;
}

interface SendToChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillMessage?: string;
  prefillContext?: string;
}

export function SendToChannelDialog({ open, onOpenChange, prefillMessage, prefillContext }: SendToChannelDialogProps) {
  const { user } = useAuth();
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [message, setMessage] = useState(prefillMessage ?? '');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setMessage(prefillMessage ?? '');
      setSelectedChannelId('');
    }
  }, [open, prefillMessage]);

  const { data: clientChannels = [], isLoading } = useQuery<ClientChannel[]>({
    queryKey: ['agent-client-channels', user?.id],
    queryFn: async () => {
      const { data: assignments, error } = await (supabase as any)
        .from('client_agent_assignments')
        .select('client_id, slack_channel_id, slack_channel_name')
        .eq('agent_id', user!.id)
        .not('slack_channel_id', 'is', null);
      if (error) throw error;
      if (!assignments?.length) return [];

      const clientIds = assignments.map((a: any) => a.client_id);
      const { data: leads } = await supabase.from('leads').select('id, name').in('id', clientIds);
      const nameById = new Map((leads ?? []).map((l) => [l.id, l.name ?? 'Unnamed client']));

      return assignments.map((a: any) => ({
        client_id: a.client_id,
        client_name: nameById.get(a.client_id) ?? 'Unnamed client',
        slack_channel_id: a.slack_channel_id,
        slack_channel_name: a.slack_channel_name,
      }));
    },
    enabled: open && !!user?.id,
  });

  const handleSend = async () => {
    if (!selectedChannelId || !message.trim()) return;
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
          body: JSON.stringify({ channel_id: selectedChannelId, text: message }),
        }
      );
      const result = await resp.json();
      if (!resp.ok || result.error) {
        throw new Error(result.error || 'Failed to send');
      }
      toast.success('Sent to Slack');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Send to Channel
          </DialogTitle>
        </DialogHeader>

        {!isLoading && clientChannels.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No Slack channels linked yet. Ask your supervisor to link a channel to your client assignments.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select value={selectedChannelId} onValueChange={setSelectedChannelId} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoading ? 'Loading channels...' : 'Select a client channel...'} />
                </SelectTrigger>
                <SelectContent>
                  {clientChannels.map((c) => (
                    <SelectItem key={c.client_id} value={c.slack_channel_id}>
                      <span className="flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                        {c.slack_channel_name || c.slack_channel_id} — {c.client_name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              {prefillContext && (
                <p className="text-xs text-muted-foreground">{prefillContext}</p>
              )}
              <Label>Message</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Type your message..."
                className="resize-none"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSend}
            disabled={sending || !selectedChannelId || !message.trim() || clientChannels.length === 0}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {sending ? 'Sending...' : 'Send to Slack'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
