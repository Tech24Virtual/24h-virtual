/**
 * Phase 6 — Default intake item seeds per checklist template.
 * Mirrors `src/lib/wl/checklistTemplates.ts` but defines the structured intake
 * fields the partner must collect from their client before submitting to fulfillment.
 */
import type { WLChecklistTemplateKey } from './checklistTemplates';

export type IntakeItemType =
  | 'text'
  | 'long_text'
  | 'number'
  | 'email'
  | 'phone'
  | 'select'
  | 'boolean'
  | 'date';

export interface IntakeItemSeed {
  item_key: string;
  label: string;
  item_type: IntakeItemType;
  is_required: boolean;
  sort_order: number;
}

const COMMON_REQUIRED: IntakeItemSeed[] = [
  { item_key: 'business_name', label: 'Business name', item_type: 'text', is_required: true, sort_order: 1 },
  { item_key: 'primary_contact_name', label: 'Primary contact name', item_type: 'text', is_required: true, sort_order: 2 },
  { item_key: 'primary_contact_email', label: 'Primary contact email', item_type: 'email', is_required: true, sort_order: 3 },
  { item_key: 'primary_contact_phone', label: 'Primary contact phone', item_type: 'phone', is_required: true, sort_order: 4 },
  { item_key: 'business_hours', label: 'Business hours', item_type: 'long_text', is_required: true, sort_order: 5 },
  { item_key: 'time_zone', label: 'Time zone', item_type: 'text', is_required: true, sort_order: 6 },
];

const COMMON_OPTIONAL: IntakeItemSeed[] = [
  { item_key: 'website_url', label: 'Website URL', item_type: 'text', is_required: false, sort_order: 50 },
  { item_key: 'special_instructions', label: 'Special instructions', item_type: 'long_text', is_required: false, sort_order: 51 },
];

export const INTAKE_TEMPLATES: Record<WLChecklistTemplateKey, IntakeItemSeed[]> = {
  standard: [
    ...COMMON_REQUIRED,
    { item_key: 'service_overview', label: 'Service overview / what we handle', item_type: 'long_text', is_required: true, sort_order: 10 },
    { item_key: 'escalation_contact', label: 'Escalation contact', item_type: 'text', is_required: true, sort_order: 11 },
    { item_key: 'preferred_kickoff_date', label: 'Preferred kickoff date', item_type: 'date', is_required: false, sort_order: 12 },
    ...COMMON_OPTIONAL,
  ],
  inbound_only: [
    ...COMMON_REQUIRED,
    { item_key: 'greeting_script', label: 'Preferred greeting / script', item_type: 'long_text', is_required: true, sort_order: 10 },
    { item_key: 'message_destination', label: 'Where to send messages (email / SMS)', item_type: 'text', is_required: true, sort_order: 11 },
    { item_key: 'after_hours_handling', label: 'After-hours handling', item_type: 'long_text', is_required: true, sort_order: 12 },
    { item_key: 'escalation_contact', label: 'Escalation contact', item_type: 'text', is_required: true, sort_order: 13 },
    ...COMMON_OPTIONAL,
  ],
  outbound_campaign: [
    ...COMMON_REQUIRED,
    { item_key: 'target_audience', label: 'Target audience description', item_type: 'long_text', is_required: true, sort_order: 10 },
    { item_key: 'list_source', label: 'Where will the list come from', item_type: 'text', is_required: true, sort_order: 11 },
    { item_key: 'dialing_window', label: 'Allowed dialing window', item_type: 'text', is_required: true, sort_order: 12 },
    { item_key: 'caller_id_number', label: 'Caller ID / phone number to use', item_type: 'phone', is_required: true, sort_order: 13 },
    { item_key: 'compliance_notes', label: 'Compliance notes (DNC, regions)', item_type: 'long_text', is_required: true, sort_order: 14 },
    ...COMMON_OPTIONAL,
  ],
  hybrid: [
    ...COMMON_REQUIRED,
    { item_key: 'inbound_script', label: 'Inbound greeting / script', item_type: 'long_text', is_required: true, sort_order: 10 },
    { item_key: 'outbound_script', label: 'Outbound script', item_type: 'long_text', is_required: true, sort_order: 11 },
    { item_key: 'queue_routing', label: 'Queue routing rules', item_type: 'long_text', is_required: true, sort_order: 12 },
    { item_key: 'caller_id_number', label: 'Outbound caller ID', item_type: 'phone', is_required: true, sort_order: 13 },
    { item_key: 'escalation_contact', label: 'Escalation contact', item_type: 'text', is_required: true, sort_order: 14 },
    ...COMMON_OPTIONAL,
  ],
  custom: [...COMMON_REQUIRED, ...COMMON_OPTIONAL],
};

export function getIntakeTemplate(key: string | null | undefined): IntakeItemSeed[] {
  const k = (key ?? 'standard') as WLChecklistTemplateKey;
  return INTAKE_TEMPLATES[k] ?? INTAKE_TEMPLATES.standard;
}
