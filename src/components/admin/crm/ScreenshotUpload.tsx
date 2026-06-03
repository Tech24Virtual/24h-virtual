import { useState, useRef, useEffect, useCallback } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ScreenshotUploadProps {
  onImageUploaded: (url: string) => void;
  disabled?: boolean;
  composerRef?: React.RefObject<HTMLTextAreaElement>;
}

export function ScreenshotUpload({ onImageUploaded, disabled, composerRef }: ScreenshotUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Only images are allowed', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 5MB', variant: 'destructive' });
      return;
    }

    setUploading(true);
    setPreview(URL.createObjectURL(file));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const ext = file.name.split('.').pop() || 'png';
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from('slack-screenshots')
        .upload(path, file, { contentType: file.type });

      if (error) throw error;

      const { data: urlData, error: signedUrlError } = await supabase.storage
        .from('slack-screenshots')
        .createSignedUrl(path, 3600); // 1 hour expiry

      if (signedUrlError || !urlData?.signedUrl) throw new Error('Failed to generate signed URL');

      onImageUploaded(urlData.signedUrl);
      setPreview(null);
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }, [onImageUploaded, toast]);

  // Listen for paste events on the composer
  useEffect(() => {
    const target = composerRef?.current;
    if (!target) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) uploadFile(file);
          return;
        }
      }
    };

    target.addEventListener('paste', handlePaste);
    return () => target.removeEventListener('paste', handlePaste);
  }, [composerRef, uploadFile]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadFile(file);
          e.target.value = '';
        }}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0"
        disabled={disabled || uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
      </Button>

      {preview && (
        <div className="absolute bottom-full left-0 mb-2 p-2 bg-card border rounded-lg shadow-lg">
          <div className="relative">
            <img src={preview} alt="Upload preview" className="max-h-[120px] rounded" />
            {uploading && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
            {!uploading && (
              <button
                onClick={() => setPreview(null)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
