import { useState } from 'react';
import { ExternalLink, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BookiiEmbedProps {
  title: string;
  height?: string;
}

// Tenant-specific Bookii workspace URL, e.g. https://app.bookii.io/embed/<workspace-id>
// Set VITE_BOOKII_URL in .env to enable the embed.
const BOOKII_URL = (import.meta.env.VITE_BOOKII_URL as string | undefined) || '';

export function BookiiEmbed({ title, height = 'calc(100vh - 200px)' }: BookiiEmbedProps) {
  const [loaded, setLoaded] = useState(false);

  if (!BOOKII_URL) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border bg-card/50 text-center gap-4 p-12"
        style={{ minHeight: '400px', height }}
      >
        <CalendarDays className="w-12 h-12 text-muted-foreground/30" />
        <div className="space-y-1">
          <p className="font-medium">Bookii not configured</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Set{' '}
            <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
              VITE_BOOKII_URL
            </code>{' '}
            in your <code className="font-mono text-xs">.env</code> file to your Bookii workspace
            embed URL, then restart the dev server.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open('https://bookii.io', '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          Sign up for Bookii
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative w-full rounded-lg overflow-hidden border bg-card" style={{ height }}>
        {!loaded && (
          <div className="absolute inset-0 flex flex-col gap-3 p-4 animate-pulse">
            <div className="h-10 rounded-md bg-muted w-1/3" />
            <div className="h-4 rounded bg-muted w-2/3" />
            <div className="flex-1 rounded-md bg-muted mt-2" />
          </div>
        )}
        <iframe
          src={BOOKII_URL}
          title={title}
          width="100%"
          height="100%"
          allow="camera; microphone; fullscreen"
          className={`border-0 transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
        />
      </div>
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground">Powered by Bookii.io</p>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => window.open(BOOKII_URL, '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink className="h-3 w-3" />
          Open in New Tab
        </Button>
      </div>
    </div>
  );
}
