/**
 * Phase 4 Wave 1 — Composite query bundle for the Build Packet PDF.
 *
 * Pulls every section the renderer needs in a single hook so the export
 * button can fire immediately. Each underlying query is RLS-scoped on the
 * server; admins (the only Wave 1 audience) pass through.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveTenant } from '@/lib/campaign-os/tenancy';
import type {
  Campaign,
  CampaignFaq,
  CampaignPolicy,
  CampaignScenario,
  ClientContact,
  ClientDepartment,
  DepartmentNumber,
  Five9VariableMapping,
  ResolvedField,
  TenantBrand,
} from '@/lib/campaign-os/types';

export interface BuildPacketBundle {
  campaign: Campaign;
  department: ClientDepartment;
  contacts: ClientContact[];
  numbers: DepartmentNumber[];
  fields: ResolvedField[];
  faqs: CampaignFaq[];
  policies: CampaignPolicy[];
  scenarios: CampaignScenario[];
  mappings: Five9VariableMapping[];
  branding: TenantBrand | null;
}

export function useBuildPacketData(campaignId: string | null | undefined) {
  return useQuery({
    queryKey: ['campaign-os', 'build-packet', campaignId],
    enabled: !!campaignId,
    queryFn: async (): Promise<BuildPacketBundle | null> => {
      const tenant = await resolveTenant();
      if (!tenant) throw new Error('Not authenticated');

      const { data: campaign, error: cErr } = await (supabase as any)
        .from('campaigns')
        .select('*')
        .eq('id', campaignId!)
        .maybeSingle();
      if (cErr) throw cErr;
      if (!campaign) throw new Error('Campaign not found');

      const deptId = (campaign as Campaign).client_department_id;

      const [
        deptRes,
        contactsRes,
        numbersRes,
        fieldsRes,
        scenariosRes,
        mappingsRes,
        brandRes,
        faqsRes,
        policiesRes,
      ] = await Promise.all([
        (supabase as any).from('client_departments').select('*').eq('id', deptId).maybeSingle(),
        (supabase as any).from('client_contacts').select('*').order('is_primary', { ascending: false }),
        (supabase as any).from('department_numbers').select('*').eq('client_department_id', deptId).order('phone_role'),
        (supabase as any).rpc('resolve_fields_for_audience', { _client_department_id: deptId, _audience: 'agent' }),
        (supabase as any)
          .from('campaign_scenarios')
          .select('*')
          .eq('campaign_id', campaignId!)
          .neq('status', 'archived')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true }),
        (supabase as any).from('five9_variable_mappings').select('*').eq('client_department_id', deptId).order('five9_variable_name'),
        (supabase as any).from('v_tenant_brand').select('*').limit(1).maybeSingle(),
        (supabase as any).rpc('resolve_effective_faqs', {
          p_tenant_kind: tenant.tenant_kind,
          p_wl_partner_id: tenant.wl_partner_id,
          p_wl_client_id: tenant.wl_client_id,
          p_client_lead_id: tenant.client_lead_id,
          p_department_id: deptId,
        }),
        (supabase as any).rpc('resolve_effective_policies', {
          p_tenant_kind: tenant.tenant_kind,
          p_wl_partner_id: tenant.wl_partner_id,
          p_wl_client_id: tenant.wl_client_id,
          p_client_lead_id: tenant.client_lead_id,
          p_department_id: deptId,
        }),
      ]);

      if (deptRes.error) throw deptRes.error;
      if (contactsRes.error) throw contactsRes.error;
      if (numbersRes.error) throw numbersRes.error;
      if (fieldsRes.error) throw fieldsRes.error;
      if (scenariosRes.error) throw scenariosRes.error;
      if (mappingsRes.error) throw mappingsRes.error;
      if (brandRes.error) throw brandRes.error;
      if (faqsRes.error) throw faqsRes.error;
      if (policiesRes.error) throw policiesRes.error;

      return {
        campaign: campaign as Campaign,
        department: deptRes.data as ClientDepartment,
        contacts: (contactsRes.data as ClientContact[]) ?? [],
        numbers: (numbersRes.data as DepartmentNumber[]) ?? [],
        fields: (fieldsRes.data as ResolvedField[]) ?? [],
        faqs: ((faqsRes.data as CampaignFaq[]) ?? []).filter((f) => f.status === 'approved'),
        policies: ((policiesRes.data as CampaignPolicy[]) ?? []).filter((p) => p.status === 'approved'),
        scenarios: (scenariosRes.data as CampaignScenario[]) ?? [],
        mappings: (mappingsRes.data as Five9VariableMapping[]) ?? [],
        branding: (brandRes.data as TenantBrand | null) ?? null,
      };
    },
  });
}
