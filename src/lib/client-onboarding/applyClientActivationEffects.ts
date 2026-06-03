/**
 * Browser-side mirror of supabase/functions/_shared/applyClientActivationEffects.ts.
 * Used by admin "Retry onboarding init" recovery action when the server-side
 * call inside create-client failed (warnings included onboarding_init_failed)
 * or for legacy lead backfill from OnboardingChecklist.
 *
 * Only callable by admins (RLS enforces it).
 */
import { supabase } from '@/integrations/supabase/client';
import {
  DIRECT_CLIENT_DEFAULT_TEMPLATE,
  buildDirectClientChecklistState,
} from './directClientTemplate';

export interface ApplyClientActivationArgs {
  leadId: string;
  leadUserId?: string | null;
  leadSnapshot?: Record<string, unknown>;
  /** When backfilling, copy these legacy boolean keys into checklist_state. */
  legacyChecklist?: Record<string, boolean> | null;
}

export interface ApplyClientActivationResult {
  handoffId: string;
  intakeId: string | null;
  alreadyExisted: boolean;
}

export async function applyClientActivationEffects(
  args: ApplyClientActivationArgs,
): Promise<ApplyClientActivationResult> {
  const { leadId, leadUserId, leadSnapshot, legacyChecklist } = args;

  // 1. Idempotency
  const { data: existing, error: existingErr } = await supabase
    .from('client_onboarding_handoffs')
    .select('id, current_intake_id')
    .eq('client_lead_id', leadId)
    .maybeSingle();
  if (existingErr) throw new Error(`lookup handoff failed: ${existingErr.message}`);
  if (existing) {
    return {
      handoffId: existing.id,
      intakeId: existing.current_intake_id ?? null,
      alreadyExisted: true,
    };
  }

  // 2. Insert handoff
  const checklistState = buildDirectClientChecklistState(legacyChecklist);
  const { data: handoff, error: handoffErr } = await supabase
    .from('client_onboarding_handoffs')
    .insert({
      client_lead_id: leadId,
      client_user_id: leadUserId ?? null,
      status: 'collecting_info',
      checklist_template: 'direct_client_default',
      checklist_state: checklistState,
    })
    .select('id')
    .single();
  if (handoffErr) throw new Error(`insert handoff failed: ${handoffErr.message}`);
  const handoffId = handoff.id;

  // 3. Seed items, copying legacy boolean values where applicable
  const itemsPayload = DIRECT_CLIENT_DEFAULT_TEMPLATE.map((t) => {
    const legacyValue = legacyChecklist?.[t.item_key];
    const isProvided = t.item_type === 'boolean' && legacyValue === true;
    return {
      handoff_id: handoffId,
      item_key: t.item_key,
      label: t.label,
      item_type: t.item_type,
      is_required: t.is_required,
      is_client_fillable: t.is_client_fillable,
      sort_order: t.sort_order,
      status: isProvided ? 'provided' : 'pending',
      value_json: isProvided ? { value: true } : null,
    };
  });
  const { error: itemsErr } = await supabase
    .from('client_handoff_items')
    .insert(itemsPayload);
  if (itemsErr) throw new Error(`seed items failed: ${itemsErr.message}`);

  // 4. Insert internal fulfillment intake
  const intakeNumber = `D-${Date.now().toString(36).toUpperCase()}`;
  const { data: intake, error: intakeErr } = await supabase
    .from('internal_fulfillment_intakes')
    .insert({
      source: 'direct',
      client_lead_id: leadId,
      intake_number: intakeNumber,
      status: 'new_submission',
      priority: 'normal',
      snapshot_json: {
        source: 'direct',
        client_lead_id: leadId,
        ...(leadSnapshot ?? {}),
      },
    })
    .select('id')
    .single();

  let intakeId: string | null = null;
  if (!intakeErr && intake) {
    intakeId = intake.id;
    await supabase
      .from('client_onboarding_handoffs')
      .update({ current_intake_id: intakeId })
      .eq('id', handoffId);
  }

  // 5. Activity log
  await supabase.from('client_onboarding_activity').insert({
    handoff_id: handoffId,
    event_type: 'client_onboarding_started',
    actor_label: 'admin_recovery',
    meta_json: {
      lead_id: leadId,
      intake_id: intakeId,
      template: 'direct_client_default',
      backfilled_from_legacy: !!legacyChecklist,
    },
  });

  return { handoffId, intakeId, alreadyExisted: false };
}
