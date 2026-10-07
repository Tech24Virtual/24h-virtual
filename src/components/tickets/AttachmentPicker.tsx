import { useRef } from 'react';
import { FileText, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ATTACHMENT_ACCEPT, MAX_ATTACHMENTS } from '@/lib/tickets/attachments';
import type { AttachmentDraft } from '@/hooks/useAttachmentDraft';

interface AttachmentPickerProps {
  draft: AttachmentDraft;
  disabled?: boolean;
  compact?: boolean;
}

/** Paperclip button + chips for the files queued on a reply. */
export function AttachmentPicker({ draft, disabled, compact }: AttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ATTACHMENT_ACCEPT}
        className="hidden"
        onChange={(e) => {
          draft.add(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size={compact ? 'sm' : 'default'}
        className={compact ? 'h-7 px-2' : undefined}
        disabled={disabled || draft.files.length >= MAX_ATTACHMENTS}
        onClick={() => inputRef.current?.click()}
        aria-label="Attach images or PDFs"
        title="Attach images or PDFs (you can also paste a screenshot)"
      >
        <Paperclip className="h-4 w-4" />
      </Button>
      {draft.files.map((file, i) => (
        <span
          key={`${file.name}-${i}`}
          className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs max-w-[220px]"
        >
          {file.type.startsWith('image/') ? (
            <img src={URL.createObjectURL(file)} alt="" className="h-5 w-5 rounded object-cover" onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)} />
          ) : (
            <FileText className="h-4 w-4 shrink-0" />
          )}
          <span className="truncate">{file.name || 'pasted image'}</span>
          <button
            type="button"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => draft.remove(i)}
            disabled={disabled}
            aria-label={`Remove ${file.name || 'attachment'}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
