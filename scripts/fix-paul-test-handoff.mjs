/**
 * One-time fix: link paul-test@24hvirtual.com's auth user to the
 * client_onboarding_handoffs row that was created with client_user_id = null
 * during lead conversion (before the invite-user function was fixed).
 *
 * Run with:  node scripts/fix-paul-test-handoff.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sdsxdqsomxuimrjpaylv.supabase.co';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkc3hkcXNvbXh1aW1yanBheWx2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTI5MDM4MiwiZXhwIjoyMDk0ODY2MzgyfQ.lwAfB8yWk9WF7Wp-865qMgR530FwhM_UEDxokj7M6YM';

const EMAIL = 'paul-test@24hvirtual.com';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 1. Find the auth user
const { data: { users }, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listErr) { console.error('listUsers failed:', listErr.message); process.exit(1); }

const authUser = users.find(u => u.email === EMAIL);
if (!authUser) { console.error(`No auth user found for ${EMAIL}`); process.exit(1); }
console.log(`Auth user: ${authUser.id} (${authUser.email})`);

// 2. Find the lead
const { data: lead, error: leadErr } = await admin
  .from('leads')
  .select('id, user_id')
  .eq('email', EMAIL)
  .maybeSingle();

if (leadErr || !lead) { console.error('Lead not found:', leadErr?.message); process.exit(1); }
console.log(`Lead: ${lead.id}  (current user_id: ${lead.user_id ?? 'null'})`);

// 3. Stamp leads.user_id if missing
if (!lead.user_id) {
  const { error: e } = await admin
    .from('leads')
    .update({ user_id: authUser.id })
    .eq('id', lead.id);
  if (e) console.error('Failed to update leads.user_id:', e.message);
  else console.log('✓ leads.user_id updated');
} else {
  console.log('leads.user_id already set — skipping');
}

// 4. Backfill client_onboarding_handoffs
const { data: handoffs, error: hErr } = await admin
  .from('client_onboarding_handoffs')
  .select('id, client_user_id')
  .eq('client_lead_id', lead.id);

if (hErr) { console.error('Handoff query failed:', hErr.message); process.exit(1); }
console.log(`Found ${handoffs?.length ?? 0} handoff row(s) for this lead`);

const nullHandoffs = (handoffs ?? []).filter(h => !h.client_user_id);
if (nullHandoffs.length === 0) {
  console.log('All handoff rows already have client_user_id set — nothing to do');
  process.exit(0);
}

const { error: updateErr } = await admin
  .from('client_onboarding_handoffs')
  .update({ client_user_id: authUser.id })
  .eq('client_lead_id', lead.id)
  .is('client_user_id', null);

if (updateErr) {
  console.error('Failed to update handoff:', updateErr.message);
  process.exit(1);
}

console.log(`✓ Updated ${nullHandoffs.length} handoff row(s) — client_user_id = ${authUser.id}`);
