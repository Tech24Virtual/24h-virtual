import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { validateAttachmentFiles } from '@/lib/tickets/attachments';

/** Holds the files a user has picked (or pasted) for the reply they are composing. */
export function useAttachmentDraft() {
  const [files, setFiles] = useState<File[]>([]);

  const add = useCallback((incoming: File[]) => {
    if (incoming.length === 0) return;
    setFiles((current) => {
      const { accepted, errors } = validateAttachmentFiles(current, incoming);
      errors.forEach((e) => toast.error(e));
      return accepted.length ? [...current, ...accepted] : current;
    });
  }, []);

  const remove = useCallback((index: number) => {
    setFiles((current) => current.filter((_, i) => i !== index));
  }, []);

  const clear = useCallback(() => setFiles([]), []);

  /** onPaste handler for the reply textarea: lets users paste screenshots straight in. */
  const onPaste = useCallback((e: React.ClipboardEvent) => {
    const pasted = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
    if (pasted.length > 0) {
      e.preventDefault();
      add(pasted);
    }
  }, [add]);

  return { files, add, remove, clear, onPaste };
}

export type AttachmentDraft = ReturnType<typeof useAttachmentDraft>;
