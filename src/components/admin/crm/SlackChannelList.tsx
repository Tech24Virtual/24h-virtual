import { useState } from 'react';
import { Hash, Lock, MessageCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SlackChannel {
  id: string;
  slack_channel_id: string;
  name: string;
  is_dm: boolean;
  is_private: boolean;
  topic: string | null;
  members: string[];
}

interface SlackChannelListProps {
  channels: SlackChannel[];
  selectedChannelId: string | null;
  onSelectChannel: (slackChannelId: string) => void;
  isLoading: boolean;
}

export function SlackChannelList({
  channels,
  selectedChannelId,
  onSelectChannel,
  isLoading,
}: SlackChannelListProps) {
  const [search, setSearch] = useState('');

  const filtered = channels.filter((ch) =>
    ch.name.toLowerCase().includes(search.toLowerCase())
  );

  const publicChannels = filtered.filter((ch) => !ch.is_dm && !ch.is_private);
  const privateChannels = filtered.filter((ch) => !ch.is_dm && ch.is_private);
  const dms = filtered.filter((ch) => ch.is_dm);

  const renderSection = (title: string, items: SlackChannel[], icon: React.ReactNode) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
          {title}
        </p>
        {items.map((ch) => (
          <button
            key={ch.slack_channel_id}
            onClick={() => onSelectChannel(ch.slack_channel_id)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left',
              selectedChannelId === ch.slack_channel_id
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-foreground hover:bg-accent'
            )}
          >
            {icon}
            <span className="truncate">{ch.name}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full border-r">
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search channels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading channels...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No channels found</p>
          ) : (
            <>
              {renderSection('Channels', publicChannels, <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />)}
              {renderSection('Private', privateChannels, <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />)}
              {renderSection('Direct Messages', dms, <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" />)}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
