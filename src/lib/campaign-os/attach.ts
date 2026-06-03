/**
 * Explicit Attach helpers — strict-no-inheritance model.
 *
 * The default UI shows ONLY same-scope items. To pull a client-level FAQ down
 * onto a location or call flow, the user must explicitly attach it. This
 * creates a NEW row at the target scope (copying the body) so the resolver
 * sees it as a same-scope match. Original row is untouched.
 */
import { supabase } from '@/integrations/supabase/client';
import type { CampaignScope } from './types';

export interface AttachTarget {
  scope: Exclude<CampaignScope, 'global' | 'tenant'>; // 'client' | 'location' | 'call_flow' | 'department'
  client_lead_id?: string | null;
  wl_client_id?: string | null;
  wl_partner_id?: string | null;
  client_location_id?: string | null;
  client_department_id?: string | null;
}

export async function attachFaq(faqId: string, target: AttachTarget) {
  const { data: src, error } = await (supabase as any)
    .from('campaign_faq_entries')
    .select('*')
    .eq('id', faqId)
    .single();
  if (error) throw error;
  const tenant_kind = target.wl_client_id ? 'wl_partner' : 'direct_24h';
  const payload = {
    tenant_kind,
    wl_partner_id: target.wl_partner_id ?? null,
    client_lead_id: target.client_lead_id ?? null,
    wl_client_id: target.wl_client_id ?? null,
    client_location_id: target.client_location_id ?? null,
    client_department_id: target.client_department_id ?? null,
    scope: target.scope,
    question: src.question,
    answer_md: src.answer_md,
    tags: src.tags ?? [],
    status: 'draft',
    version: 1,
  };
  const { data, error: insertErr } = await (supabase as any)
    .from('campaign_faq_entries')
    .insert(payload)
    .select('*')
    .single();
  if (insertErr) throw insertErr;
  return data;
}

export async function attachPolicy(policyId: string, target: AttachTarget) {
  const { data: src, error } = await (supabase as any)
    .from('campaign_policy_blocks')
    .select('*')
    .eq('id', policyId)
    .single();
  if (error) throw error;
  const tenant_kind = target.wl_client_id ? 'wl_partner' : 'direct_24h';
  const payload = {
    tenant_kind,
    wl_partner_id: target.wl_partner_id ?? null,
    client_lead_id: target.client_lead_id ?? null,
    wl_client_id: target.wl_client_id ?? null,
    client_location_id: target.client_location_id ?? null,
    client_department_id: target.client_department_id ?? null,
    scope: target.scope,
    policy_kind: src.policy_kind,
    title: src.title,
    body_md: src.body_md,
    tags: src.tags ?? [],
    status: 'draft',
    version: 1,
  };
  const { data, error: insertErr } = await (supabase as any)
    .from('campaign_policy_blocks')
    .insert(payload)
    .select('*')
    .single();
  if (insertErr) throw insertErr;
  return data;
}
