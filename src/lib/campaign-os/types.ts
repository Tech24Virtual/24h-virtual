/**
 * Campaign OS — TypeScript shapes mirroring Phase 1 + 2 schema.
 *
 * Identity rule: every row carries (tenant_kind, wl_partner_id?, client_lead_id?, wl_client_id?).
 * Exactly one of (client_lead_id, wl_client_id) is set; wl_partner_id is set iff tenant_kind='wl_partner'.
 */

export type CampaignTenantKind = 'direct_24h' | 'wl_partner';

export type DepartmentLifecycle =
  | 'lead' | 'onboarding_started' | 'intake_in_progress' | 'build_packet_ready'
  | 'script_ready' | 'training_ready' | 'qa_ready' | 'approved_for_go_live'
  | 'live' | 'change_requested' | 'archived';

export type DepartmentTypeEnum =
  | 'sales' | 'billing' | 'customer_service' | 'new_claim'
  | 'other_requests' | 'dealership' | 'general_inquiry' | 'custom';

export type PhoneRole =
  | 'main' | 'overflow' | 'after_hours' | 'billing'
  | 'sales' | 'voicemail' | 'callback' | 'other';

export type CampaignFieldType =
  | 'text' | 'long_text' | 'number' | 'boolean'
  | 'dropdown' | 'multi_select' | 'date' | 'datetime'
  | 'phone' | 'email' | 'currency' | 'rich_text' | 'hidden';

export type CampaignScope = 'global' | 'tenant' | 'client' | 'location' | 'call_flow' | 'department';
export type CallFlowOwnerKind = 'client' | 'location';
export type RoutingEntryType = 'direct' | 'ivr' | 'both' | 'logical';
export type LocationStatus = 'active' | 'paused' | 'archived';

export interface ClientLocation extends TenantIdentity {
  id: string;
  name: string;
  code: string | null;
  status: LocationStatus;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Call Flow — the operational unit. Backed by `client_departments` table for
 * back-compat. A call flow belongs to a client directly OR to a location.
 */
export interface CallFlow extends ClientDepartment {
  client_location_id: string | null;
  owner_kind: CallFlowOwnerKind;
  routing_entry_type: RoutingEntryType;
  display_name: string | null;
}
export type CampaignAudience = 'agent' | 'supervisor' | 'client' | 'wl_partner' | 'wl_end_client';
export type Five9VariableKind = 'native' | 'custom' | 'campaign_profile';
export type Five9Direction = 'inbound_display' | 'outbound_logging' | 'summary_render' | 'internal_analytics';

export interface TenantIdentity {
  tenant_kind: CampaignTenantKind;
  wl_partner_id: string | null;
  client_lead_id: string | null;
  wl_client_id: string | null;
}

export interface TenantBrand extends TenantIdentity {
  brand_label: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  sender_name: string | null;
  sender_email: string | null;
  support_email: string | null;
  support_phone: string | null;
  footer_html: string | null;
  social_links: Record<string, unknown>;
  source: 'override' | 'wl_branding';
}

export interface ClientDepartment extends TenantIdentity {
  id: string;
  department_name: string;
  department_type: DepartmentTypeEnum;
  service_type: string | null;
  lifecycle: DepartmentLifecycle;
  go_live_status: string | null;
  onboarding_owner: string | null;
  supervisor_owner: string | null;
  primary_contact_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientContact extends TenantIdentity {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'primary' | 'billing' | 'escalation' | 'tech' | 'other';
  is_primary: boolean;
  notes: string | null;
}

export interface DepartmentNumber extends TenantIdentity {
  id: string;
  client_department_id: string;
  dnis: string | null;
  forwarding_number: string | null;
  ani_display: string | null;
  transfer_display: string | null;
  voicemail_enabled: boolean;
  callback_enabled: boolean;
  phone_role: PhoneRole;
  active: boolean;
  notes: string | null;
}

export interface CampaignFaq extends TenantIdentity {
  id: string;
  scope: CampaignScope;
  client_department_id: string | null;
  question: string;
  answer_md: string;
  tags: string[];
  status: 'draft' | 'approved' | 'archived';
  version: number;
  effective_from: string | null;
  effective_to: string | null;
  precedence_rank?: number;
}

export interface CampaignPolicy extends TenantIdentity {
  id: string;
  scope: CampaignScope;
  client_department_id: string | null;
  policy_kind: 'service_rule' | 'restricted_disclosure' | 'escalation_rule' | 'general_policy';
  title: string;
  body_md: string;
  tags: string[];
  status: 'draft' | 'approved' | 'archived';
  version: number;
  effective_from: string | null;
  effective_to: string | null;
  precedence_rank?: number;
}

export interface ResolvedField {
  field_id: string;
  field_group_id: string | null;
  field_key: string;
  display_label: string;
  field_type: CampaignFieldType;
  is_required: boolean;
  placeholder: string | null;
  help_text: string | null;
  validation_json: Record<string, unknown>;
  sort_order: number;
  scope: CampaignScope;
}

export interface Five9VariableMapping extends TenantIdentity {
  id: string;
  client_department_id: string | null;
  field_id: string | null;
  variable_group_id: string | null;
  five9_variable_name: string;
  five9_variable_kind: Five9VariableKind;
  data_type: 'text' | 'number' | 'boolean' | 'date' | 'datetime' | 'phone' | 'email';
  direction: Five9Direction[];
  is_active: boolean;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Phase 4 Wave 1 — campaigns + scenarios + publish-version placeholder
// ---------------------------------------------------------------------------

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'archived';
export type ScenarioStatus = 'draft' | 'approved' | 'archived';

export interface Campaign extends TenantIdentity {
  id: string;
  client_department_id: string;
  display_name: string;
  status: CampaignStatus;
  published_version_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CampaignScenario extends TenantIdentity {
  id: string;
  campaign_id: string;
  client_department_id: string; // trigger-populated, never user-authored
  title: string;
  trigger_md: string;
  expected_outcome_md: string;
  disposition: string | null;
  routing: string | null;
  tags: string[];
  status: ScenarioStatus;
  version: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CampaignPublishVersion extends TenantIdentity {
  id: string;
  campaign_id: string;
  version: number;
  snapshot: Record<string, unknown>;
  published_at: string;
  published_by: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}
