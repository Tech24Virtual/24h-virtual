/**
 * Direct-client onboarding template.
 * Mirrors the 7 keys originally hard-coded in src/components/admin/OnboardingChecklist.tsx
 * so direct clients have parity with the legacy lead.onboarding_checklist while
 * moving to the new client_handoff_items table.
 */
export interface DirectClientItemSeed {
  item_key: string;
  label: string;
  item_type: 'boolean' | 'text' | 'long_text' | 'phone' | 'email';
  is_required: boolean;
  is_client_fillable: boolean;
  sort_order: number;
}

/** 7 ops-managed checklist items (legacy keys preserved for backfill). */
const OPS_ITEMS: DirectClientItemSeed[] = [
  { item_key: 'consultation_completed', label: 'Initial consultation completed', item_type: 'boolean', is_required: true, is_client_fillable: false, sort_order: 1 },
  { item_key: 'call_flows_created', label: 'Call flows created', item_type: 'boolean', is_required: true, is_client_fillable: false, sort_order: 2 },
  { item_key: 'scripts_written', label: 'Agent scripts written', item_type: 'boolean', is_required: true, is_client_fillable: false, sort_order: 3 },
  { item_key: 'dispositions_configured', label: 'Dispositions configured', item_type: 'boolean', is_required: true, is_client_fillable: false, sort_order: 4 },
  { item_key: 'post_call_flow_setup', label: 'Post-call notes flow set up', item_type: 'boolean', is_required: true, is_client_fillable: false, sort_order: 5 },
  { item_key: 'forwarding_number_assigned', label: 'Forwarding number assigned', item_type: 'boolean', is_required: true, is_client_fillable: false, sort_order: 6 },
  { item_key: 'test_call_completed', label: 'Client test call completed', item_type: 'boolean', is_required: true, is_client_fillable: false, sort_order: 7 },
];

/** Items the client fills in themselves on /client-dashboard/setup. */
const CLIENT_FILLABLE_ITEMS: DirectClientItemSeed[] = [
  { item_key: 'business_name', label: 'Business name', item_type: 'text', is_required: true, is_client_fillable: true, sort_order: 10 },
  { item_key: 'primary_contact_name', label: 'Primary contact name', item_type: 'text', is_required: true, is_client_fillable: true, sort_order: 11 },
  { item_key: 'primary_contact_phone', label: 'Primary contact phone', item_type: 'phone', is_required: true, is_client_fillable: true, sort_order: 12 },
  { item_key: 'business_hours', label: 'Business hours', item_type: 'long_text', is_required: true, is_client_fillable: true, sort_order: 13 },
  { item_key: 'time_zone', label: 'Time zone', item_type: 'text', is_required: true, is_client_fillable: true, sort_order: 14 },
  { item_key: 'greeting_preference', label: 'Preferred greeting / script notes', item_type: 'long_text', is_required: false, is_client_fillable: true, sort_order: 15 },
  { item_key: 'escalation_contact', label: 'Escalation contact (name + number)', item_type: 'text', is_required: true, is_client_fillable: true, sort_order: 16 },
];

export const DIRECT_CLIENT_DEFAULT_TEMPLATE: DirectClientItemSeed[] = [
  ...OPS_ITEMS,
  ...CLIENT_FILLABLE_ITEMS,
];

/** Initial checklist_state seeded onto the handoff (boolean ops items only, for legacy parity). */
export function buildDirectClientChecklistState(
  legacy?: Record<string, boolean> | null,
): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  for (const item of OPS_ITEMS) {
    state[item.item_key] = !!legacy?.[item.item_key];
  }
  return state;
}
