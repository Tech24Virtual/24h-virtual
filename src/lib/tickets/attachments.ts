import { supabase } from '@/integrations/supabase/client';

// Attachments on ticket_replies (support_tickets lane). Files live in the private
// `ticket-attachments` bucket at <ticket_id>/<uuid>-<filename>; ticket_replies.attachments
// stores [{ path, name, type, size }] and the UI signs URLs on demand.

export type TicketAttachment = {
  path: string;
  name: string;
  type: string;
  size: number;
};

export const TICKET_ATTACHMENT_BUCKET = 'ticket-attachments';
export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
] as const;

export const ATTACHMENT_ACCEPT = ALLOWED_ATTACHMENT_TYPES.join(',');

export const isImageAttachment = (a: Pick<TicketAttachment, 'type'>) => a.type.startsWith('image/');

/** Validate files against the existing selection; returns accepted files and human-readable problems. */
export function validateAttachmentFiles(existing: File[], incoming: File[]) {
  const accepted: File[] = [];
  const errors: string[] = [];
  for (const file of incoming) {
    if (existing.length + accepted.length >= MAX_ATTACHMENTS) {
      errors.push(`You can attach up to ${MAX_ATTACHMENTS} files per message`);
      break;
    }
    if (!(ALLOWED_ATTACHMENT_TYPES as readonly string[]).includes(file.type)) {
      errors.push(`${file.name || 'File'}: only images (JPG, PNG, GIF, WebP) and PDFs are allowed`);
      continue;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      errors.push(`${file.name || 'File'}: larger than 10 MB`);
      continue;
    }
    accepted.push(file);
  }
  return { accepted, errors };
}

/** Upload files for a ticket and return the metadata to store on the reply. */
export async function uploadTicketAttachments(ticketId: string, files: File[]): Promise<TicketAttachment[]> {
  const uploaded: TicketAttachment[] = [];
  for (const file of files) {
    const safeName = (file.name || 'pasted-image').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
    const path = `${ticketId}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage
      .from(TICKET_ATTACHMENT_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(`Could not upload ${file.name || 'file'}: ${error.message}`);
    uploaded.push({ path, name: file.name || safeName, type: file.type, size: file.size });
  }
  return uploaded;
}

/** Defensive parse of the jsonb column. */
export function parseAttachments(value: unknown): TicketAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (a): a is TicketAttachment =>
      !!a && typeof a === 'object' &&
      typeof (a as TicketAttachment).path === 'string' &&
      typeof (a as TicketAttachment).name === 'string' &&
      typeof (a as TicketAttachment).type === 'string',
  ).map((a) => ({ ...a, size: Number(a.size) || 0 }));
}
