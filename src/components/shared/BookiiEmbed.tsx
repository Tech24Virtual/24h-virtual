import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BookiiEmbedProps {
  title: string;
  height?: string;
}

export function BookiiEmbed({ title, height = 'calc(100vh - 140px)' }: BookiiEmbedProps) {
  const [loaded, setLoaded] = useState(false);

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
          src="https://bookii.io"
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
          onClick={() => window.open('https://bookii.io', '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink className="h-3 w-3" />
          Open in New Tab
        </Button>
      </div>
    </div>
  );
}
