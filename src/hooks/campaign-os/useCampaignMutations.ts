/**
 * Phase 3 — Campaign OS mutation hooks. All routed through `resolveTenant`
 * so identity columns are always populated server-trusted.
 *
 * Direct hand-rolled tenant predicates are forbidden per Phase 1+2 lock —
 * see `src/lib/campaign-os/tenancy.ts`.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveTenant } from '@/lib/campaign-os/tenancy';
import type {
  CampaignScope,
  CampaignFieldType,
  Five9VariableKind,
  DepartmentTypeEnum,
} from '@/lib/campaign-os/types';

interface FaqInput {
  id?: string;
  scope: CampaignScope;
  client_department_id?: string | null;
  question: string;
  answer_md: string;
  tags?: string[];
  status?: 'draft' | 'approved' | 'archived';
}

async function insertKnowledgeSnapshot(
  entity: 'faq' | 'policy',
  record: any,
  userId: string | null,
) {
  try {
    await (supabase as any).from('campaign_knowledge_versions').insert({
      entity,
      entity_id: record.id,
      version: record.version,
      snapshot: record,
      tenant_kind: record.tenant_kind ?? null,
      wl_partner_id: record.wl_partner_id ?? null,
      client_lead_id: record.client_lead_id ?? null,
      wl_client_id: record.wl_client_id ?? null,
      created_by: userId ?? null,
    });
  } catch {
    // Snapshot is auxiliary — never surface this error to the user.
  }
}

export function useUpsertFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: FaqInput) => {
      const tenant = await resolveTenant();

      // Build tenant identity based on scope:
      //  global     → null identity (trigger ignores tenant_kind for global rows)
      //  department → inherit from the client_departments row (admin users have no
      //               own tenant identity, so resolveTenant() returns nulls which
      //               the DB trigger rejects; reading from the dept is authoritative
      //               and matches the pattern in useCreateCampaign)
      //  client/tenant → use the caller's own resolved tenant identity
      let identity: { tenant_kind: any; wl_partner_id: string | null; wl_client_id: string | null; client_lead_id: string | null; client_department_id: string | null };

      if (input.scope === 'global') {
        identity = { tenant_kind: 'direct_24h' as any, wl_partner_id: null, wl_client_id: null, client_lead_id: null, client_department_id: null };
      } else if (input.scope === 'department' && input.client_department_id) {
        const { data: dept, error: deptErr } = await (supabase as any)
          .from('client_departments')
          .select('tenant_kind, wl_partner_id, client_lead_id, wl_client_id')
          .eq('id', input.client_department_id)
          .single();
        if (deptErr) throw deptErr;
        identity = {
          tenant_kind: dept.tenant_kind,
          wl_partner_id: dept.wl_partner_id,
          client_lead_id: dept.client_lead_id,
          wl_client_id: dept.wl_client_id,
          client_department_id: input.client_department_id,
        };
      } else if (
        // scope='tenant' or 'client': admin users have no personal tenant identity,
        // so we read it from the context department (selected call flow). Non-admin
        // users (WL partners, direct leads) already have identity from resolveTenant().
        tenant?.is_admin && !tenant.client_lead_id && !tenant.wl_client_id
        && input.client_department_id
      ) {
        const { data: dept, error: deptErr } = await (supabase as any)
          .from('client_departments')
          .select('tenant_kind, wl_partner_id, client_lead_id, wl_client_id')
          .eq('id', input.client_department_id)
          .single();
        if (deptErr) throw deptErr;
        identity = {
          tenant_kind: dept.tenant_kind,
          wl_partner_id: dept.wl_partner_id,
          client_lead_id: dept.client_lead_id,
          wl_client_id: dept.wl_client_id,
          client_department_id: null,  // tenant/client scope: no specific dept stored
        };
      } else {
        identity = {
          tenant_kind: tenant?.tenant_kind ?? 'direct_24h',
          wl_partner_id: tenant?.wl_partner_id ?? null,
          wl_client_id: tenant?.wl_client_id ?? null,
          client_lead_id: tenant?.client_lead_id ?? null,
          client_department_id: null,
        };
      }
      const payload = {
        ...identity,
        scope: input.scope,
        question: input.question,
        answer_md: input.answer_md,
        tags: input.tags ?? [],
        status: input.status ?? 'draft',
      };

      let record: any;

      if (input.id) {
        // Fetch current version before update so we can increment it.
        const { data: current, error: fetchErr } = await (supabase as any)
          .from('campaign_faq_entries')
          .select('version')
          .eq('id', input.id)
          .single();
        if (fetchErr) throw fetchErr;
        const { data, error } = await (supabase as any)
          .from('campaign_faq_entries')
          .update({ ...payload, version: (current?.version ?? 1) + 1 })
          .eq('id', input.id)
          .select('*')
          .single();
        if (error) throw error;
        record = data;
      } else {
        const { data, error } = await (supabase as any)
          .from('campaign_faq_entries')
          .insert(payload)
          .select('*')
          .single();
        if (error) throw error;
        record = data;
      }

      await insertKnowledgeSnapshot('faq', record, tenant?.user_id ?? null);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-os', 'faqs-effective'] });
      qc.invalidateQueries({ queryKey: ['campaign-os', 'faqs-candidates'] });
    },
  });
}

interface PolicyInput {
  id?: string;
  scope: CampaignScope;
  client_department_id?: string | null;
  policy_kind: 'service_rule' | 'restricted_disclosure' | 'escalation_rule' | 'general_policy';
  title: string;
  body_md: string;
  tags?: string[];
  status?: 'draft' | 'approved' | 'archived';
  effective_from?: string | null;
  effective_to?: string | null;
}

export function useUpsertPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PolicyInput) => {
      const tenant = await resolveTenant();

      // Same three-way identity resolution as useUpsertFaq — see comments there.
      let identity: { tenant_kind: any; wl_partner_id: string | null; wl_client_id: string | null; client_lead_id: string | null; client_department_id: string | null };

      if (input.scope === 'global') {
        identity = { tenant_kind: 'direct_24h' as any, wl_partner_id: null, wl_client_id: null, client_lead_id: null, client_department_id: null };
      } else if (input.scope === 'department' && input.client_department_id) {
        const { data: dept, error: deptErr } = await (supabase as any)
          .from('client_departments')
          .select('tenant_kind, wl_partner_id, client_lead_id, wl_client_id')
          .eq('id', input.client_department_id)
          .single();
        if (deptErr) throw deptErr;
        identity = {
          tenant_kind: dept.tenant_kind,
          wl_partner_id: dept.wl_partner_id,
          client_lead_id: dept.client_lead_id,
          wl_client_id: dept.wl_client_id,
          client_department_id: input.client_department_id,
        };
      } else if (
        tenant?.is_admin && !tenant.client_lead_id && !tenant.wl_client_id
        && input.client_department_id
      ) {
        const { data: dept, error: deptErr } = await (supabase as any)
          .from('client_departments')
          .select('tenant_kind, wl_partner_id, client_lead_id, wl_client_id')
          .eq('id', input.client_department_id)
          .single();
        if (deptErr) throw deptErr;
        identity = {
          tenant_kind: dept.tenant_kind,
          wl_partner_id: dept.wl_partner_id,
          client_lead_id: dept.client_lead_id,
          wl_client_id: dept.wl_client_id,
          client_department_id: null,
        };
      } else {
        identity = {
          tenant_kind: tenant?.tenant_kind ?? 'direct_24h',
          wl_partner_id: tenant?.wl_partner_id ?? null,
          wl_client_id: tenant?.wl_client_id ?? null,
          client_lead_id: tenant?.client_lead_id ?? null,
          client_department_id: null,
        };
      }
      const payload = {
        ...identity,
        scope: input.scope,
        policy_kind: input.policy_kind,
        title: input.title,
        body_md: input.body_md,
        tags: input.tags ?? [],
        status: input.status ?? 'draft',
        effective_from: input.effective_from ?? null,
        effective_to: input.effective_to ?? null,
      };

      let record: any;

      if (input.id) {
        const { data: current, error: fetchErr } = await (supabase as any)
          .from('campaign_policy_blocks')
          .select('version')
          .eq('id', input.id)
          .single();
        if (fetchErr) throw fetchErr;
        const { data, error } = await (supabase as any)
          .from('campaign_policy_blocks')
          .update({ ...payload, version: (current?.version ?? 1) + 1 })
          .eq('id', input.id)
          .select('*')
          .single();
        if (error) throw error;
        record = data;
      } else {
        const { data, error } = await (supabase as any)
          .from('campaign_policy_blocks')
          .insert(payload)
          .select('*')
          .single();
        if (error) throw error;
        record = data;
      }

      await insertKnowledgeSnapshot('policy', record, tenant?.user_id ?? null);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-os', 'policies-effective'] });
      qc.invalidateQueries({ queryKey: ['campaign-os', 'policies-candidates'] });
    },
  });
}

interface FieldInput {
  id?: string;
  scope: CampaignScope;
  client_department_id?: string | null;
  field_group_id?: string | null;
  field_key: string;
  display_label: string;
  field_type: CampaignFieldType;
  is_required?: boolean;
  sort_order?: number;
  status?: 'draft' | 'approved' | 'archived';
}

export function useUpsertField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: FieldInput) => {
      const tenant = await resolveTenant();
      const identity = input.scope === 'global'
        ? { tenant_kind: null as any, wl_partner_id: null, wl_client_id: null, client_lead_id: null, client_department_id: null }
        : {
            tenant_kind: tenant?.tenant_kind ?? 'direct_24h',
            wl_partner_id: tenant?.wl_partner_id ?? null,
            wl_client_id: tenant?.wl_client_id ?? null,
            client_lead_id: tenant?.client_lead_id ?? null,
            client_department_id: input.scope === 'department' ? (input.client_department_id ?? null) : null,
          };
      const payload = {
        ...identity,
        scope: input.scope,
        field_group_id: input.field_group_id ?? null,
        field_key: input.field_key,
        display_label: input.display_label,
        field_type: input.field_type,
        is_required: input.is_required ?? false,
        sort_order: input.sort_order ?? 0,
        status: input.status ?? 'draft',
      };
      const { error } = input.id
        ? await (supabase as any).from('campaign_fields').update(payload).eq('id', input.id)
        : await (supabase as any).from('campaign_fields').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-os'] }),
  });
}

interface DepartmentInput {
  id?: string;
  department_name: string;
  department_type: DepartmentTypeEnum;
  service_type?: string | null;
  notes?: string | null;
}

export function useUpsertDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DepartmentInput) => {
      const tenant = await resolveTenant();
      const payload: any = {
        tenant_kind: tenant?.tenant_kind ?? 'direct_24h',
        wl_partner_id: tenant?.wl_partner_id ?? null,
        wl_client_id: tenant?.wl_client_id ?? null,
        client_lead_id: tenant?.client_lead_id ?? null,
        department_name: input.department_name,
        department_type: input.department_type,
        service_type: input.service_type ?? null,
        notes: input.notes ?? null,
      };
      const { error, data } = input.id
        ? await (supabase as any).from('client_departments').update(payload).eq('id', input.id).select('id').single()
        : await (supabase as any).from('client_departments').insert(payload).select('id').single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-os', 'departments'] }),
  });
}

interface Five9MappingInput {
  id?: string;
  client_department_id: string;
  field_id?: string | null;
  five9_variable_name: string;
  five9_variable_kind: Five9VariableKind;
  data_type: string;
  direction: string[];
  is_active?: boolean;
  notes?: string | null;
}

export function useUpsertFive9Mapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Five9MappingInput) => {
      const tenant = await resolveTenant();
      const payload: any = {
        tenant_kind: tenant?.tenant_kind ?? 'direct_24h',
        wl_partner_id: tenant?.wl_partner_id ?? null,
        wl_client_id: tenant?.wl_client_id ?? null,
        client_lead_id: tenant?.client_lead_id ?? null,
        client_department_id: input.client_department_id,
        field_id: input.field_id ?? null,
        five9_variable_name: input.five9_variable_name,
        five9_variable_kind: input.five9_variable_kind,
        data_type: input.data_type,
        direction: input.direction,
        is_active: input.is_active ?? true,
        notes: input.notes ?? null,
      };
      const { error } = input.id
        ? await (supabase as any).from('five9_variable_mappings').update(payload).eq('id', input.id)
        : await (supabase as any).from('five9_variable_mappings').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-os', 'five9-mappings'] }),
  });
}

// ---------------------------------------------------------------------------
// P0-6 — Authoring loop closure: approve + soft-delete (archive) mutations.
// All routed through `resolveTenant`; admin role passes RLS.
// ---------------------------------------------------------------------------

function invalidateFaqs(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['campaign-os', 'faqs-effective'] });
  qc.invalidateQueries({ queryKey: ['campaign-os', 'faqs-candidates'] });
  qc.invalidateQueries({ queryKey: ['campaign-os', 'faqs-drafts'] });
}
function invalidatePolicies(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['campaign-os', 'policies-effective'] });
  qc.invalidateQueries({ queryKey: ['campaign-os', 'policies-candidates'] });
  qc.invalidateQueries({ queryKey: ['campaign-os', 'policies-drafts'] });
}

export function useApproveFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('campaign_faq_entries')
        .update({ status: 'approved', published_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateFaqs(qc),
  });
}

export function useArchiveFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('campaign_faq_entries')
        .update({ status: 'archived' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateFaqs(qc),
  });
}

export function useApprovePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('campaign_policy_blocks')
        .update({ status: 'approved', published_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidatePolicies(qc),
  });
}

export function useArchivePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('campaign_policy_blocks')
        .update({ status: 'archived' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidatePolicies(qc),
  });
}

export function useArchiveField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('campaign_fields')
        .update({ status: 'archived' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-os'] }),
  });
}

export function useArchiveDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('client_departments')
        .update({ lifecycle: 'archived' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-os', 'departments'] }),
  });
}

// ---------------------------------------------------------------------------
// Phase 4 Wave 1 — campaigns + scenarios mutations.
// Identity for `campaigns` is copied from the source department.
// Identity for `campaign_scenarios` is read from the parent campaign — the
// `inherit_dept_from_campaign` trigger overrides any client-supplied dept.
// ---------------------------------------------------------------------------

function invalidateCampaigns(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['campaign-os', 'campaigns'] });
  qc.invalidateQueries({ queryKey: ['campaign-os', 'eligible-departments'] });
  qc.invalidateQueries({ queryKey: ['campaign-os', 'campaign'] });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { client_department_id: string; display_name: string; notes?: string }) => {
      const { data: dept, error: dErr } = await (supabase as any)
        .from('client_departments')
        .select('tenant_kind, wl_partner_id, client_lead_id, wl_client_id')
        .eq('id', input.client_department_id)
        .single();
      if (dErr) throw dErr;
      const payload: any = {
        tenant_kind: dept.tenant_kind,
        wl_partner_id: dept.wl_partner_id,
        client_lead_id: dept.client_lead_id,
        wl_client_id: dept.wl_client_id,
        client_department_id: input.client_department_id,
        display_name: input.display_name,
        notes: input.notes ?? null,
        status: 'draft',
      };
      const { data, error } = await (supabase as any)
        .from('campaigns')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => invalidateCampaigns(qc),
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; display_name?: string; notes?: string | null; status?: 'draft' | 'active' | 'paused' | 'archived' }) => {
      const patch: any = {};
      if (input.display_name !== undefined) patch.display_name = input.display_name;
      if (input.notes !== undefined) patch.notes = input.notes;
      if (input.status !== undefined) patch.status = input.status;
      const { error } = await (supabase as any).from('campaigns').update(patch).eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateCampaigns(qc),
  });
}

export function useArchiveCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('campaigns').update({ status: 'archived' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateCampaigns(qc),
  });
}

function invalidateScenarios(qc: ReturnType<typeof useQueryClient>, campaignId?: string) {
  qc.invalidateQueries({ queryKey: ['campaign-os', 'scenarios', campaignId] });
  qc.invalidateQueries({ queryKey: ['campaign-os', 'scenarios'] });
  qc.invalidateQueries({ queryKey: ['campaign-os', 'build-packet'] });
}

export interface ScenarioInput {
  id?: string;
  campaign_id: string;
  title: string;
  trigger_md: string;
  expected_outcome_md: string;
  disposition?: string | null;
  routing?: string | null;
  tags?: string[];
  status?: 'draft' | 'approved' | 'archived';
  sort_order?: number;
}

export function useUpsertScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ScenarioInput) => {
      // Read parent campaign for tenant identity. The inherit_dept trigger
      // will override client_department_id server-side; we don't pass it.
      const { data: parent, error: pErr } = await (supabase as any)
        .from('campaigns')
        .select('tenant_kind, wl_partner_id, client_lead_id, wl_client_id')
        .eq('id', input.campaign_id)
        .single();
      if (pErr) throw pErr;
      const payload: any = {
        tenant_kind: parent.tenant_kind,
        wl_partner_id: parent.wl_partner_id,
        client_lead_id: parent.client_lead_id,
        wl_client_id: parent.wl_client_id,
        campaign_id: input.campaign_id,
        title: input.title,
        trigger_md: input.trigger_md,
        expected_outcome_md: input.expected_outcome_md,
        disposition: input.disposition ?? null,
        routing: input.routing ?? null,
        tags: input.tags ?? [],
        status: input.status ?? 'draft',
        sort_order: input.sort_order ?? 100,
      };
      const { error } = input.id
        ? await (supabase as any).from('campaign_scenarios').update(payload).eq('id', input.id)
        : await (supabase as any).from('campaign_scenarios').insert(payload);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => invalidateScenarios(qc, vars.campaign_id),
  });
}

export function useApproveScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('campaign_scenarios')
        .update({ status: 'approved' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateScenarios(qc),
  });
}

export function useArchiveScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('campaign_scenarios')
        .update({ status: 'archived' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateScenarios(qc),
  });
}
