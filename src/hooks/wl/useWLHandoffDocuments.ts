import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWLPartnerId } from './useWLPartnerId';
import { toast } from 'sonner';

const BUCKET = 'wl-fulfillment-documents';
const MAX_BYTES = 25 * 1024 * 1024;

export type WLDocumentType =
  | 'script'
  | 'logo'
  | 'voicemail_audio'
  | 'policy'
  | 'id_verification'
  | 'signed_agreement'
  | 'other';

export interface WLHandoffDocument {
  id: string;
  partner_id: string;
  handoff_id: string;
  document_type: WLDocumentType;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  status: 'active' | 'superseded' | 'removed';
  created_at: string;
}

export function useWLHandoffDocuments(handoffId: string | undefined) {
  return useQuery({
    queryKey: ['wl-handoff-documents', handoffId],
    enabled: !!handoffId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wl_partner_handoff_documents')
        .select('*')
        .eq('handoff_id', handoffId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WLHandoffDocument[];
    },
  });
}

export function useWLHandoffDocumentMutations(handoffId: string | undefined) {
  const queryClient = useQueryClient();
  const { data: partnerId } = useWLPartnerId();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['wl-handoff-documents', handoffId] });

  const upload = useMutation({
    mutationFn: async (input: { file: File; document_type: WLDocumentType }) => {
      if (!handoffId || !partnerId) throw new Error('Missing handoff or partner');
      if (input.file.size > MAX_BYTES) {
        throw new Error('File exceeds 25 MB limit');
      }
      const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
      const path = `${partnerId}/${handoffId}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, input.file, { contentType: input.file.type, upsert: false });
      if (upErr) throw upErr;

      const { data: user } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from('wl_partner_handoff_documents').insert({
        partner_id: partnerId,
        handoff_id: handoffId,
        document_type: input.document_type,
        file_path: path,
        file_name: safeName,
        file_size: input.file.size,
        mime_type: input.file.type || null,
        uploaded_by: user.user?.id ?? null,
        status: 'active',
      });
      if (insErr) {
        // best-effort: remove the orphaned file
        await supabase.storage.from(BUCKET).remove([path]);
        throw insErr;
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success('Document uploaded');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const supersede = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('wl_partner_handoff_documents')
        .update({ status: 'superseded' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Document marked superseded');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (doc: WLHandoffDocument) => {
      const { error: delErr } = await supabase
        .from('wl_partner_handoff_documents')
        .delete()
        .eq('id', doc.id);
      if (delErr) throw delErr;
      await supabase.storage.from(BUCKET).remove([doc.file_path]).catch(() => undefined);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Document removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getSignedUrl = async (path: string) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error) throw error;
    return data.signedUrl;
  };

  return { upload, supersede, remove, getSignedUrl };
}
