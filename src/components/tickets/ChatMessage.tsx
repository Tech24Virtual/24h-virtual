import { format } from 'date-fns';
import { Lock } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ChatMessageProps {
  authorName: string | null;
  authorId: string | null;
  message: string;
  createdAt: string;
  isInternal?: boolean;
  isSender: boolean;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function ChatMessage({
  authorName,
  message,
  createdAt,
  isInternal,
  isSender,
}: ChatMessageProps) {
  // Internal notes: centered, yellow styling
  if (isInternal) {
    return (
      <div className="flex justify-center">
        <div className="max-w-[85%] px-4 py-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Lock className="h-3 w-3 text-yellow-700 dark:text-yellow-400" />
            <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
              Internal Note
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 mb-1">
            <span className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
              {authorName || 'Staff'}
            </span>
            <span className="text-[10px] text-yellow-600 dark:text-yellow-500">
              {format(new Date(createdAt), 'MMM d, h:mm a')}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm text-yellow-900 dark:text-yellow-100">{message}</p>
        </div>
      </div>
    );
  }

  const initials = getInitials(authorName);

  return (
    <div className={`flex items-end gap-2 ${isSender ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar on left for receiver */}
      {!isSender && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="text-xs bg-muted text-muted-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`max-w-[75%] ${isSender ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Author name */}
        <span className={`text-xs text-muted-foreground mb-1 px-1 ${isSender ? 'text-right self-end' : 'text-left self-start'}`}>
          {authorName || 'Staff'}
        </span>

        {/* Bubble */}
        <div
          className={`px-4 py-2.5 text-sm whitespace-pre-wrap ${
            isSender
              ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
              : 'bg-muted text-foreground rounded-2xl rounded-bl-md'
          }`}
        >
          {message}
        </div>

        {/* Timestamp */}
        <span className={`text-[10px] text-muted-foreground mt-1 px-1 ${isSender ? 'self-end' : 'self-start'}`}>
          {format(new Date(createdAt), 'MMM d, h:mm a')}
        </span>
      </div>

      {/* Avatar on right for sender */}
      {isSender && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
