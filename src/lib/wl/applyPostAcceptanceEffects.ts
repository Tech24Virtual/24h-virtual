/**
 * Phase 5 — Post-acceptance effects (dashboard side).
 *
 * Idempotently creates the onboarding handoff + initial follow-up tasks
 * after a proposal moves to `accepted`. Safe to call multiple times: each
 * insert is gated by an existence check.
 *
 * The edge function `wl-proposal-public` keeps an inline copy of this same
 * logic (Deno can't import this file). When changing behaviour here, update
 * the edge function too.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getChecklistTemplate } from './checklistTemplates';
import { getIntakeTemplate } from './fulfillmentTemplates';

interface ProposalLite {
  id: string;
  partner_id: string;
  lead_id: string | null;
  title: string;
  offering_name: string | null;
  scope_summary: string | null;
  amount: number | null;
  currency: string | null;
  accepted_by_name: string | null;
  checklist_template?: string | null;
}

interface LeadLite {
  name: string | null;
  email: string | null;
  company: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

async function logTaskCreated(
  supabase: SupabaseClient,
  partnerId: string,
  proposalId: string,
  taskTitle: string,
  sourceEvent: string,
  actorUserId: string | null,
) {
  try {
    await supabase.from('wl_partner_proposal_activity').insert({
      partner_id: partnerId,
      proposal_id: proposalId,
      event_type: 'task_created',
      actor_user_id: actorUserId,
      actor_label: null,
      metadata: { task_title: taskTitle, source_event: sourceEvent } as never,
    });
  } catch (e) {
    console.warn('task_created activity insert failed:', e);
  }
}

export async function applyPostAcceptanceEffects(
  supabase: SupabaseClient,
  proposal: ProposalLite,
  actorUserId: string | null,
): Promise<{ handoffId: string | null }> {
  const clientName =
    proposal.accepted_by_name?.trim() ||
    'the client';

  // 1. Resolve lead snapshot data (best-effort)
  let leadSnap: LeadLite = { name: null, email: null, company: null };
  if (proposal.lead_id) {
    const { data } = await supabase
      .from('wl_partner_leads')
      .select('name, email, company')
      .eq('id', proposal.lead_id)
      .maybeSingle();
    if (data) leadSnap = data as LeadLite;
  }

  const snapshotName = leadSnap.name ?? proposal.accepted_by_name ?? null;

  // 2. Idempotent handoff insert (UNIQUE(proposal_id) protects us too)
  let handoffId: string | null = null;
  const { data: existingHandoff } = await supabase
    .from('wl_partner_onboarding_handoffs')
    .select('id')
    .eq('proposal_id', proposal.id)
    .maybeSingle();

  if (existingHandoff?.id) {
    handoffId = existingHandoff.id as string;
  } else {
    // Seed checklist_state from the proposal's selected template
    const template = getChecklistTemplate(proposal.checklist_template);
    const seededChecklist = template.steps.map((step) => ({
      key: step.key,
      completed: false,
      completed_at: null,
    }));

    const { data: inserted, error: handoffErr } = await supabase
      .from('wl_partner_onboarding_handoffs')
      .insert({
        partner_id: proposal.partner_id,
        proposal_id: proposal.id,
        lead_id: proposal.lead_id ?? null,
        status: 'pending',
        client_name_snapshot: snapshotName,
        client_email_snapshot: leadSnap.email ?? null,
        company_snapshot: leadSnap.company ?? null,
        accepted_scope_snapshot: proposal.scope_summary ?? null,
        accepted_amount_snapshot: proposal.amount ?? null,
        currency_snapshot: proposal.currency ?? null,
        checklist_state: seededChecklist as never,
        created_by: actorUserId,
      })
      .select('id')
      .single();
    if (handoffErr) {
      console.warn('handoff insert failed:', handoffErr);
    } else {
      handoffId = inserted?.id as string;
    }
  }

  // 2b. Seed intake items from the fulfillment template (idempotent).
  if (handoffId) {
    try {
      const intake = getIntakeTemplate(proposal.checklist_template);
      const rows = intake.map((s) => ({
        partner_id: proposal.partner_id,
        handoff_id: handoffId,
        item_key: s.item_key,
        label: s.label,
        item_type: s.item_type,
        is_required: s.is_required,
        sort_order: s.sort_order,
        status: 'pending' as const,
      }));
      if (rows.length) {
        await supabase
          .from('wl_partner_handoff_items')
          .upsert(rows, { onConflict: 'handoff_id,item_key', ignoreDuplicates: true });
      }
    } catch (e) {
      console.warn('intake item seed failed:', e);
    }
  }

  // 3. Idempotent onboarding task
  const { data: existingOnboarding } = await supabase
    .from('wl_partner_tasks')
    .select('id')
    .eq('proposal_id', proposal.id)
    .eq('source_event', 'proposal_accepted')
    .eq('task_type', 'onboarding')
    .maybeSingle();

  if (!existingOnboarding) {
    const onboardingTitle = `Begin onboarding for ${clientName}`;
    const { error } = await supabase.from('wl_partner_tasks').insert({
      partner_id: proposal.partner_id,
      proposal_id: proposal.id,
      lead_id: proposal.lead_id ?? null,
      handoff_id: handoffId,
      title: onboardingTitle,
      description: proposal.title
        ? `Accepted proposal: ${proposal.title}`
        : null,
      task_type: 'onboarding',
      status: 'open',
      priority: 'high',
      source_event: 'proposal_accepted',
      created_by: actorUserId,
    });
    if (error) {
      console.warn('onboarding task insert failed:', error);
    } else {
      await logTaskCreated(
        supabase,
        proposal.partner_id,
        proposal.id,
        onboardingTitle,
        'proposal_accepted',
        actorUserId,
      );
    }
  }

  // 4. Idempotent follow-up task (kickoff confirmation)
  const { data: existingFollowup } = await supabase
    .from('wl_partner_tasks')
    .select('id')
    .eq('proposal_id', proposal.id)
    .eq('source_event', 'proposal_accepted')
    .eq('task_type', 'follow_up')
    .maybeSingle();

  if (!existingFollowup) {
    const dueAt = new Date(Date.now() + 3 * DAY_MS).toISOString();
    const followupTitle = `Confirm kickoff with ${clientName}`;
    const { error } = await supabase.from('wl_partner_tasks').insert({
      partner_id: proposal.partner_id,
      proposal_id: proposal.id,
      lead_id: proposal.lead_id ?? null,
      handoff_id: handoffId,
      title: followupTitle,
      task_type: 'follow_up',
      status: 'open',
      priority: 'medium',
      source_event: 'proposal_accepted',
      due_at: dueAt,
      created_by: actorUserId,
    });
    if (error) {
      console.warn('follow_up task insert failed:', error);
    } else {
      await logTaskCreated(
        supabase,
        proposal.partner_id,
        proposal.id,
        followupTitle,
        'proposal_accepted',
        actorUserId,
      );
    }
  }

  return { handoffId };
}

export async function applyDeclineEffects(
  supabase: SupabaseClient,
  proposal: ProposalLite,
  actorUserId: string | null,
): Promise<void> {
  const clientName = proposal.accepted_by_name?.trim() || 'the client';

  const { data: existing } = await supabase
    .from('wl_partner_tasks')
    .select('id')
    .eq('proposal_id', proposal.id)
    .eq('source_event', 'proposal_declined')
    .maybeSingle();
  if (existing) return;

  const reviewTitle = `Review declined proposal — ${clientName}`;
  const { error } = await supabase.from('wl_partner_tasks').insert({
    partner_id: proposal.partner_id,
    proposal_id: proposal.id,
    lead_id: proposal.lead_id ?? null,
    title: reviewTitle,
    description: proposal.title || null,
    task_type: 'review',
    status: 'open',
    priority: 'low',
    source_event: 'proposal_declined',
    created_by: actorUserId,
  });
  if (error) {
    console.warn('declined review task insert failed:', error);
  } else {
    await logTaskCreated(
      supabase,
      proposal.partner_id,
      proposal.id,
      reviewTitle,
      'proposal_declined',
      actorUserId,
    );
  }
}
