import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { SlackChannelList } from './SlackChannelList';
import { SlackMessageThread } from './SlackMessageThread';
import { MessageQuickActions } from './MessageQuickActions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, AlertCircle, PanelRightClose, PanelRightOpen } from 'lucide-react';

export function SlackMessenger() {
  const { user } = useAuth();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Get current user's Slack mapping
  const { data: userMapping, isLoading: mappingLoading } = useQuery({
    queryKey: ['slack-user-mapping', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('slack_user_mappings')
        .select('slack_user_id, slack_display_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch channels filtered by user's membership
  const { data: channels = [], isLoading: channelsLoading, isError: channelsError, refetch: refetchChannels } = useQuery({
    queryKey: ['slack-channels', userMapping?.slack_user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('slack_channels')
        .select('*')
        .order('name');

      if (error) throw error;

      // Filter client-side: only channels where user is a member (or all for admin without mapping)
      if (userMapping?.slack_user_id) {
        return data.filter((ch) => ch.members?.includes(userMapping.slack_user_id));
      }
      return data;
    },
    enabled: true,
  });

  const selectedChannel = channels.find((ch) => ch.slack_channel_id === selectedChannelId);

  // Show spinner while the mapping query is in flight — avoids flashing the
  // "not connected" card for users who do have a mapping.
  if (mappingLoading) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="h-8 w-8 mx-auto text-muted-foreground mb-3 animate-spin" />
        <p className="text-sm text-muted-foreground">Connecting to Slack…</p>
      </Card>
    );
  }

  if (!userMapping) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="font-medium">Slack not connected</p>
        <p className="text-sm text-muted-foreground">Connect Slack in System → Integrations</p>
      </div>
    );
  }

  if (channelsError) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
        <p className="font-medium">Failed to load Slack channels</p>
        <p className="text-sm text-muted-foreground mt-1">Check your Slack integration or try refreshing</p>
        <Button variant="outline" className="mt-4" onClick={() => refetchChannels()}>Retry</Button>
      </Card>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden flex h-[600px] bg-card">
      <div className="w-64 shrink-0">
        <SlackChannelList
          channels={channels}
          selectedChannelId={selectedChannelId}
          onSelectChannel={setSelectedChannelId}
          isLoading={channelsLoading}
        />
      </div>
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Toggle quick actions button in header area */}
        {selectedChannelId && (
          <div className="absolute top-2 right-2 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowQuickActions(!showQuickActions)}
              title={showQuickActions ? 'Hide quick actions' : 'Show quick actions'}
            >
              {showQuickActions ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
        <SlackMessageThread
          channelId={selectedChannelId}
          channelName={selectedChannel?.name || ''}
          currentUserSlackId={userMapping.slack_user_id}
        />
      </div>
      {showQuickActions && (
        <div className="w-80 shrink-0 border-l">
          <MessageQuickActions channelName={selectedChannel?.name} />
        </div>
      )}
    </div>
  );
}
