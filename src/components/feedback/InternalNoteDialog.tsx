import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  required?: boolean;
  busy?: boolean;
  onConfirm: (note: string) => void | Promise<void>;
}

export function InternalNoteDialog({ open, onOpenChange, title, description, confirmLabel, required = true, busy, onConfirm }: Props) {
  const [note, setNote] = useState('');
  useEffect(() => { if (!open) setNote(''); }, [open]);

  const canSubmit = required ? note.trim().length > 0 : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="note-body">
            Internal note {required && <span className="text-destructive">*</span>}
          </Label>
          <Textarea
            id="note-body"
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={required ? 'Required: short context for the team' : 'Optional context'}
            maxLength={2000}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={() => onConfirm(note.trim())} disabled={!canSubmit || busy}>
            {busy ? 'Saving…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
