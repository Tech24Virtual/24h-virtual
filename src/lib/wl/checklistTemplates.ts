/**
 * Onboarding checklist templates for white-label proposals.
 *
 * Each template defines the default steps that preload into a handoff's
 * `checklist_state` when the proposal is accepted. Partners pick the template
 * on the proposal form; `applyPostAcceptanceEffects` reads it and seeds the
 * handoff with `{ key, completed: false, completed_at: null }` per step.
 *
 * Allowed template keys are mirrored in `validate_wl_partner_proposal` (DB
 * trigger). If you add or rename one, update the trigger too.
 */

export type WLChecklistTemplateKey =
  | 'standard'
  | 'inbound_only'
  | 'outbound_campaign'
  | 'hybrid'
  | 'custom';

export interface WLChecklistStep {
  key: string;
  label: string;
}

export interface WLChecklistTemplate {
  key: WLChecklistTemplateKey;
  label: string;
  description: string;
  steps: WLChecklistStep[];
}

export const CHECKLIST_TEMPLATES: Record<WLChecklistTemplateKey, WLChecklistTemplate> = {
  standard: {
    key: 'standard',
    label: 'Standard',
    description: 'General onboarding for most engagements.',
    steps: [
      { key: 'kickoff_date', label: 'Confirm kickoff date with client' },
      { key: 'intake_info', label: 'Collect required intake information' },
      { key: 'scripts_callflows', label: 'Set up scripts and call flows' },
      { key: 'training_session', label: 'Schedule training session' },
      { key: 'service_active', label: 'Activate service and confirm go-live' },
    ],
  },
  inbound_only: {
    key: 'inbound_only',
    label: 'Inbound only',
    description: 'Receptionist-style inbound coverage.',
    steps: [
      { key: 'greeting_script', label: 'Approve greeting script' },
      { key: 'business_hours', label: 'Confirm business hours and coverage' },
      { key: 'message_handoff', label: 'Define message handoff workflow' },
      { key: 'escalation_contacts', label: 'Collect escalation contacts' },
      { key: 'service_active', label: 'Activate service and confirm go-live' },
    ],
  },
  outbound_campaign: {
    key: 'outbound_campaign',
    label: 'Outbound campaign',
    description: 'Outreach and dialer campaigns.',
    steps: [
      { key: 'target_list', label: 'Import target list and segments' },
      { key: 'dialing_window', label: 'Confirm dialing window and time zones' },
      { key: 'script_approval', label: 'Approve outbound script' },
      { key: 'compliance_review', label: 'Complete compliance review' },
      { key: 'campaign_launch', label: 'Launch campaign and monitor first runs' },
    ],
  },
  hybrid: {
    key: 'hybrid',
    label: 'Hybrid (inbound + outbound)',
    description: 'Combined inbound coverage and outbound activity.',
    steps: [
      { key: 'kickoff_date', label: 'Confirm kickoff date with client' },
      { key: 'scripts_callflows', label: 'Approve inbound and outbound scripts' },
      { key: 'dialer_config', label: 'Configure dialer and queues' },
      { key: 'training_session', label: 'Run combined training session' },
      { key: 'soft_launch', label: 'Soft launch and monitor early calls' },
      { key: 'full_launch', label: 'Full launch and confirm go-live' },
    ],
  },
  custom: {
    key: 'custom',
    label: 'Custom',
    description: 'Build the checklist manually after kickoff.',
    steps: [],
  },
};

export function getChecklistTemplate(key: string | null | undefined): WLChecklistTemplate {
  const k = (key ?? 'standard') as WLChecklistTemplateKey;
  return CHECKLIST_TEMPLATES[k] ?? CHECKLIST_TEMPLATES.standard;
}

export function listChecklistTemplates(): WLChecklistTemplate[] {
  return [
    CHECKLIST_TEMPLATES.standard,
    CHECKLIST_TEMPLATES.inbound_only,
    CHECKLIST_TEMPLATES.outbound_campaign,
    CHECKLIST_TEMPLATES.hybrid,
    CHECKLIST_TEMPLATES.custom,
  ];
}
