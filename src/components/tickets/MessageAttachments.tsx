import { useQuery } from '@tanstack/react-query';
import { Download, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  TICKET_ATTACHMENT_BUCKET,
  isImageAttachment,
  type TicketAttachment,
} from '@/lib/tickets/attachments';

interface MessageAttachmentsProps {
  attachments: TicketAttachment[];
  className?: string;
}

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Renders image thumbnails inline and PDFs as download links, using short-lived signed URLs. */
export function MessageAttachments({ attachments, className }: MessageAttachmentsProps) {
  const paths = attachments.map((a) => a.path);

  const { data: urls = {} } = useQuery({
    queryKey: ['ticket-attachment-urls', ...paths],
    enabled: paths.length > 0,
    staleTime: 50 * 60 * 1000, // signed for 1h
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(TICKET_ATTACHMENT_BUCKET)
        .createSignedUrls(paths, 3600);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((d) => { if (d.path && d.signedUrl) map[d.path] = d.signedUrl; });
      return map;
    },
  });

  if (attachments.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ''}`}>
      {attachments.map((a) => {
        const url = urls[a.path];
        if (isImageAttachment(a)) {
          return url ? (
            <a key={a.path} href={url} target="_blank" rel="noopener noreferrer" title={a.name}>
              <img
                src={url}
                alt={a.name}
                loading="lazy"
                className="max-h-48 max-w-full rounded-md border bg-background object-cover"
              />
            </a>
          ) : (
            <div key={a.path} className="h-24 w-32 animate-pulse rounded-md bg-muted" aria-label={`Loading ${a.name}`} />
          );
        }
        return (
          <a
            key={a.path}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            download={a.name}
            aria-disabled={!url}
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs text-foreground hover:bg-accent aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate max-w-[180px]">{a.name}</span>
            <span className="text-muted-foreground">{formatSize(a.size)}</span>
            <Download className="h-3 w-3 shrink-0" />
          </a>
        );
      })}
    </div>
  );
}
