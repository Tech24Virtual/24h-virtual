import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWLPartnerId } from './useWLPartnerId';
import { toast } from 'sonner';
import { getIntakeTemplate, type IntakeItemType } from '@/lib/wl/fulfillmentTemplates';

export interface WLHandoffItem {
  id: string;
  partner_id: string;
  handoff_id: string;
  item_key: string;
  label: string;
  item_type: IntakeItemType;
  is_required: boolean;
  value_json: { value?: unknown } | null;
  status: 'pending' | 'provided' | 'na';
  notes: string | null;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useWLHandoffItems(handoffId: string | undefined) {
  return useQuery({
    queryKey: ['wl-handoff-items', handoffId],
    enabled: !!handoffId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wl_partner_handoff_items')
        .select('*')
        .eq('handoff_id', handoffId!)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as WLHandoffItem[];
    },
  });
}

export function useWLHandoffItemMutations(handoffId: string | undefined) {
  const queryClient = useQueryClient();
  const { data: partnerId } = useWLPartnerId();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['wl-handoff-items', handoffId] });
    queryClient.invalidateQueries({ queryKey: ['wl-partner-handoff', handoffId] });
  };

  const updateItem = useMutation({
    mutationFn: async (input: {
      id: string;
      value?: unknown;
      status?: 'pending' | 'provided' | 'na';
      notes?: string | null;
    }) => {
      const patch: Record<string, unknown> = {};
      if ('value' in input) patch.value_json = { value: input.value };
      if ('status' in input) patch.status = input.status;
      if ('notes' in input) patch.notes = input.notes?.toString().slice(0, 2000) || null;
      const { data, error } = await supabase
        .from('wl_partner_handoff_items')
        .update(patch)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as WLHandoffItem;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const seedFromTemplate = useMutation({
    mutationFn: async (templateKey: string) => {
      if (!handoffId || !partnerId) throw new Error('Missing handoff or partner');
      const template = getIntakeTemplate(templateKey);
      const rows = template.map((s) => ({
        partner_id: partnerId,
        handoff_id: handoffId,
        item_key: s.item_key,
        label: s.label,
        item_type: s.item_type,
        is_required: s.is_required,
        sort_order: s.sort_order,
        status: 'pending' as const,
      }));
      // Upsert by (handoff_id, item_key) — onConflict ignores existing rows
      const { error } = await supabase
        .from('wl_partner_handoff_items')
        .upsert(rows, { onConflict: 'handoff_id,item_key', ignoreDuplicates: true });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Intake items seeded');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { updateItem, seedFromTemplate };
}
