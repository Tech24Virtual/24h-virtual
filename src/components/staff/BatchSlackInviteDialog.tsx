import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, Hash, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface BatchSlackInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentName: string;
  slackUserId: string;
}

export function BatchSlackInviteDialog({
  open,
  onOpenChange,
  agentName,
  slackUserId,
}: BatchSlackInviteDialogProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['slack-channels-for-invite'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('slack_channels')
        .select('id, slack_channel_id, name, is_private, members')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const alreadyIn = new Set(
    channels
      .filter((ch) => (ch.members as string[] || []).includes(slackUserId))
      .map((ch) => ch.slack_channel_id)
  );

  const filtered = channels.filter((ch) =>
    !search || ch.name?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleChannel = (channelId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) next.delete(channelId);
      else next.add(channelId);
      return next;
    });
  };

  const invite = useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            slack_user_id: slackUserId,
            channel_ids: Array.from(selected),
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to invite');
      }
      return res.json();
    },
    onSuccess: (data) => {
      const count = data.succeeded?.length || 0;
      const failCount = data.failed?.length || 0;
      toast({
        title: `Added to ${count} channel${count !== 1 ? 's' : ''}`,
        description: failCount > 0 ? `${failCount} failed` : undefined,
      });
      setSelected(new Set());
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    },
  });

  const newSelections = selected.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add {agentName} to Slack Channels</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search channels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 min-h-0 max-h-[40vh] border rounded-md p-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No channels found</p>
          ) : (
            filtered.map((ch) => {
              const isIn = alreadyIn.has(ch.slack_channel_id);
              const isSelected = selected.has(ch.slack_channel_id);
              return (
                <div
                  key={ch.id}
                  className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-muted/50"
                >
                  <Checkbox
                    id={`ch-${ch.id}`}
                    checked={isIn || isSelected}
                    disabled={isIn}
                    onCheckedChange={() => toggleChannel(ch.slack_channel_id)}
                  />
                  <Label
                    htmlFor={`ch-${ch.id}`}
                    className={`flex items-center gap-1.5 text-sm cursor-pointer ${isIn ? 'text-muted-foreground' : ''}`}
                  >
                    {ch.is_private ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : (
                      <Hash className="h-3.5 w-3.5" />
                    )}
                    {ch.name}
                    {isIn && <span className="text-xs text-muted-foreground ml-1">(already in)</span>}
                  </Label>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={newSelections === 0 || invite.isPending}
            onClick={() => invite.mutate()}
          >
            {invite.isPending
              ? 'Adding...'
              : `Add to ${newSelections} Channel${newSelections !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
