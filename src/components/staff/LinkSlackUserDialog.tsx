import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SlackUser {
  slack_user_id: string;
  display_name: string;
  email: string | null;
}

interface LinkSlackUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentUserId: string;
  agentName: string;
}

export function LinkSlackUserDialog({ open, onOpenChange, agentUserId, agentName }: LinkSlackUserDialogProps) {
  const [selectedSlackUser, setSelectedSlackUser] = useState('');
  const queryClient = useQueryClient();

  const { data: slackUsers = [], isLoading } = useQuery({
    queryKey: ['slack-users-for-linking'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await supabase.functions.invoke('slack-sync', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (resp.error) throw resp.error;
      return (resp.data?.slack_users || []) as SlackUser[];
    },
    enabled: open,
    staleTime: 60_000,
  });

  const { data: existingMappings = [] } = useQuery({
    queryKey: ['slack-user-mappings'],
    queryFn: async () => {
      const { data } = await supabase.from('slack_user_mappings').select('slack_user_id');
      return (data || []).map(m => m.slack_user_id);
    },
    enabled: open,
  });

  const availableUsers = slackUsers.filter(u => !existingMappings.includes(u.slack_user_id));

  const linkMutation = useMutation({
    mutationFn: async () => {
      const chosen = slackUsers.find(u => u.slack_user_id === selectedSlackUser);
      if (!chosen) throw new Error('No user selected');
      const { error } = await supabase.from('slack_user_mappings').upsert({
        user_id: agentUserId,
        slack_user_id: chosen.slack_user_id,
        slack_display_name: chosen.display_name,
      }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Linked ${agentName} to Slack`);
      queryClient.invalidateQueries({ queryKey: ['slack-user-mappings'] });
      queryClient.invalidateQueries({ queryKey: ['supervisor-agents'] });
      onOpenChange(false);
      setSelectedSlackUser('');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to link'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link Slack Account</DialogTitle>
          <DialogDescription>Select a Slack user to link to {agentName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Select value={selectedSlackUser} onValueChange={setSelectedSlackUser}>
            <SelectTrigger>
              <SelectValue placeholder={isLoading ? 'Loading Slack users...' : 'Select a Slack user'} />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.map(u => (
                <SelectItem key={u.slack_user_id} value={u.slack_user_id}>
                  {u.display_name}{u.email ? ` (${u.email})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="w-full gap-2"
            disabled={!selectedSlackUser || linkMutation.isPending}
            onClick={() => linkMutation.mutate()}
          >
            <Link2 className="h-4 w-4" />
            {linkMutation.isPending ? 'Linking...' : 'Link Account'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
