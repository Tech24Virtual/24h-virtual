/**
 * Server-side direct-client onboarding initializer.
 *
 * Idempotent: if a handoff already exists for the lead, returns it without
 * creating duplicates. Always uses the service-role supabase client so that
 * the inserts succeed atomically inside the create-client flow.
 *
 * Mirrored client-side at src/lib/client-onboarding/applyClientActivationEffects.ts
 * for admin-triggered "retry onboarding init" recovery actions.
 */

// 7 ops items + 7 client-fillable items, mirrored from
// src/lib/client-onboarding/directClientTemplate.ts. Kept duplicated here on
// purpose: edge functions cannot import from src/.
interface ItemSeed {
  item_key: string;
  label: string;
  item_type: 'boolean' | 'text' | 'long_text' | 'phone' | 'email';
  is_required: boolean;
  is_client_fillable: boolean;
  sort_order: number;
}

const TEMPLATE: ItemSeed[] = [
  { item_key: 'consultation_completed', label: 'Initial consultation completed', item_type: 'boolean', is_required: true, is_client_fillable: false, sort_order: 1 },
  { item_key: 'call_flows_created', label: 'Call flows created', item_type: 'boolean', is_required: true, is_client_fillable: false, sort_order: 2 },
  { item_key: 'scripts_written', label: 'Agent scripts written', item_type: 'boolean', is_required: true, is_client_fillable: false, sort_order: 3 },
  { item_key: 'dispositions_configured', label: 'Dispositions configured', item_type: 'boolean', is_required: true, is_client_fillable: false, sort_order: 4 },
  { item_key: 'post_call_flow_setup', label: 'Post-call notes flow set up', item_type: 'boolean', is_required: true, is_client_fillable: false, sort_order: 5 },
  { item_key: 'forwarding_number_assigned', label: 'Forwarding number assigned', item_type: 'boolean', is_required: true, is_client_fillable: false, sort_order: 6 },
  { item_key: 'test_call_completed', label: 'Client test call completed', item_type: 'boolean', is_required: true, is_client_fillable: false, sort_order: 7 },
  { item_key: 'business_name', label: 'Business name', item_type: 'text', is_required: true, is_client_fillable: true, sort_order: 10 },
  { item_key: 'primary_contact_name', label: 'Primary contact name', item_type: 'text', is_required: true, is_client_fillable: true, sort_order: 11 },
  { item_key: 'primary_contact_phone', label: 'Primary contact phone', item_type: 'phone', is_required: true, is_client_fillable: true, sort_order: 12 },
  { item_key: 'business_hours', label: 'Business hours', item_type: 'long_text', is_required: true, is_client_fillable: true, sort_order: 13 },
  { item_key: 'time_zone', label: 'Time zone', item_type: 'text', is_required: true, is_client_fillable: true, sort_order: 14 },
  { item_key: 'greeting_preference', label: 'Preferred greeting / script notes', item_type: 'long_text', is_required: false, is_client_fillable: true, sort_order: 15 },
  { item_key: 'escalation_contact', label: 'Escalation contact (name + number)', item_type: 'text', is_required: true, is_client_fillable: true, sort_order: 16 },
];

interface ApplyArgs {
  leadId: string;
  leadUserId?: string | null;
  leadSnapshot?: Record<string, unknown>;
}

interface ApplyResult {
  handoffId: string;
  intakeId: string | null;
  alreadyExisted: boolean;
}

// deno-lint-ignore no-explicit-any
type SupabaseAdmin = any;

export async function applyClientActivationEffects(
  supabaseAdmin: SupabaseAdmin,
  args: ApplyArgs,
): Promise<ApplyResult> {
  const { leadId, leadUserId, leadSnapshot } = args;

  // 1. Idempotency: existing handoff?
  const { data: existing, error: existingErr } = await supabaseAdmin
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

  // 2. Build initial checklist_state (boolean ops items, all false)
  const checklistState: Record<string, boolean> = {};
  for (const item of TEMPLATE) {
    if (item.item_type === 'boolean') checklistState[item.item_key] = false;
  }

  // 3. Insert handoff
  const { data: handoff, error: handoffErr } = await supabaseAdmin
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
  const handoffId = handoff.id as string;

  // 4. Seed items
  const itemsPayload = TEMPLATE.map((t) => ({
    handoff_id: handoffId,
    item_key: t.item_key,
    label: t.label,
    item_type: t.item_type,
    is_required: t.is_required,
    is_client_fillable: t.is_client_fillable,
    sort_order: t.sort_order,
    status: 'pending',
  }));
  const { error: itemsErr } = await supabaseAdmin
    .from('client_handoff_items')
    .insert(itemsPayload);
  if (itemsErr) throw new Error(`seed items failed: ${itemsErr.message}`);

  // 5. Insert internal fulfillment intake (source='direct')
  const snapshot = {
    source: 'direct',
    client_lead_id: leadId,
    ...(leadSnapshot ?? {}),
  };
  const intakeNumber = `D-${Date.now().toString(36).toUpperCase()}`;
  const { data: intake, error: intakeErr } = await supabaseAdmin
    .from('internal_fulfillment_intakes')
    .insert({
      source: 'direct',
      client_lead_id: leadId,
      intake_number: intakeNumber,
      status: 'new_submission',
      priority: 'normal',
      snapshot_json: snapshot,
    })
    .select('id')
    .single();
  let intakeId: string | null = null;
  if (intakeErr) {
    // Don't fail the whole call — handoff is still valid. Log via activity.
    console.warn('[applyClientActivationEffects] intake insert failed:', intakeErr.message);
  } else {
    intakeId = intake.id as string;
    await supabaseAdmin
      .from('client_onboarding_handoffs')
      .update({ current_intake_id: intakeId })
      .eq('id', handoffId);
  }

  // 6. Activity log
  await supabaseAdmin.from('client_onboarding_activity').insert({
    handoff_id: handoffId,
    event_type: 'client_onboarding_started',
    actor_label: 'system',
    meta_json: {
      lead_id: leadId,
      intake_id: intakeId,
      template: 'direct_client_default',
    },
  });

  return { handoffId, intakeId, alreadyExisted: false };
}
