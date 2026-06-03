import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, ExternalLink, RefreshCw, ShieldAlert } from 'lucide-react';

const BUCKET = 'wl-fulfillment-documents';
const TTL_SECONDS = 3600;

interface Props {
  path: string;
  fileName: string;
  mimeType: string | null;
  /**
   * Defense-in-depth UI flag. The bucket RLS is the actual gate; this prevents
   * the component from even calling storage when the caller obviously lacks role.
   */
  authorized: boolean;
}

function isImage(mime: string | null) {
  return !!mime && mime.startsWith('image/');
}

function isPdf(mime: string | null, name: string) {
  return mime === 'application/pdf' || name.toLowerCase().endsWith('.pdf');
}

export function SignedUrlViewer({ path, fileName, mimeType, authorized }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [tick, setTick] = useState(0);

  const issue = useCallback(async () => {
    if (!authorized) {
      setError('Access denied');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, TTL_SECONDS);
    if (err || !data?.signedUrl) {
      setError('Access denied');
      setUrl(null);
    } else {
      setUrl(data.signedUrl);
      setExpiresAt(Date.now() + TTL_SECONDS * 1000);
    }
    setLoading(false);
  }, [path, authorized]);

  useEffect(() => {
    issue();
  }, [issue]);

  useEffect(() => {
    if (!url) return;
    const t = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, [url]);

  if (loading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (error || !url) {
    return (
      <div className="border rounded-md p-6 text-center bg-muted/30">
        <ShieldAlert className="w-6 h-6 mx-auto mb-2 text-destructive" />
        <p className="text-sm font-medium">Access denied</p>
        <p className="text-xs text-muted-foreground mt-1">
          You don't have permission to view this document.
        </p>
      </div>
    );
  }

  const remainingMs = expiresAt - Date.now();
  const remainingMin = Math.max(0, Math.floor(remainingMs / 60_000));
  void tick; // keep dep for re-render

  return (
    <div className="space-y-2">
      <div className="border rounded-md overflow-hidden bg-muted/20">
        {isImage(mimeType) ? (
          <img src={url} alt={fileName} className="max-h-[480px] w-full object-contain" />
        ) : isPdf(mimeType, fileName) ? (
          <iframe
            src={url}
            title={fileName}
            className="w-full h-[480px]"
          />
        ) : (
          <div className="p-6 text-center">
            <p className="text-sm font-medium mb-1">{fileName}</p>
            <p className="text-xs text-muted-foreground mb-3">
              {mimeType || 'Binary file'}
            </p>
            <Button asChild size="sm" variant="outline">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <Download className="w-4 h-4 mr-2" /> Download
              </a>
            </Button>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Link expires in ~{remainingMin}m</span>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => issue()}>
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </Button>
          <Button asChild size="sm" variant="ghost" className="h-7 px-2">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3 mr-1" /> Open
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
