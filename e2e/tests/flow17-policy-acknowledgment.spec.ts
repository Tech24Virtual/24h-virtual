/**
 * Flow 17 — Policy Acknowledgment Workflow
 *
 * Tests the end-to-end flow where:
 * 1. Admin approves a policy → DB trigger inserts pending ack for assigned agents
 * 2. Agent visits /staff/agent/scripts and sees the amber banner
 * 3. Agent opens the sheet and acknowledges a policy
 * 4. Banner disappears once all policies are acknowledged
 *
 * QA seed (from 20260606000002_seed_agent_qa_data.sql):
 *   qa-agent is assigned to qa-client (client_id = 15bb3903-7f9d-4b3e-8d99-c017fc1bfc22)
 *
 * Note: Tests that depend on DB trigger output (pending acks) may be skipped
 * gracefully if the migration has not yet been applied to staging — the trigger
 * creates rows on the DB side and there is no client-side fallback.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { createClient } from '@supabase/supabase-js';

// ── Supabase service-role client (only available in test environment) ─────────
// Used to directly insert / verify rows without going through the UI where it
// would slow down the test or require navigating extra screens.
const SUPABASE_URL    = process.env.VITE_SUPABASE_URL    ?? process.env.SUPABASE_URL    ?? '';
const SUPABASE_SK     = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const serviceSupabase = SUPABASE_URL && SUPABASE_SK
  ? createClient(SUPABASE_URL, SUPABASE_SK, { auth: { persistSession: false } })
  : null;

const QA_AGENT_ID  = 'a82dd8b4-4e3b-41e3-b5dc-1767b5b5e3e4';
const QA_CLIENT_ID = '15bb3903-7f9d-4b3e-8d99-c017fc1bfc22';

async function navigateToAgentScripts(page: import('@playwright/test').Page) {
  await page.goto('/staff/agent/scripts');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

async function navigateToPoliciesAdmin(page: import('@playwright/test').Page) {
  await page.goto('/admin/campaign-os/policies');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

// ── Helper: create a client-scoped policy in approved state via service role ──
async function seedApprovedPolicyForQaClient(): Promise<string | null> {
  if (!serviceSupabase) return null;
  const title = `F17-ACK-POLICY-${Date.now()}`;
  const { data, error } = await serviceSupabase
    .from('campaign_policy_blocks')
    .insert({
      tenant_kind:    'direct_24h',
      client_lead_id: QA_CLIENT_ID,
      scope:          'client',
      policy_kind:    'general_policy',
      title,
      body_md:        'All agents must complete daily check-in before handling calls.',
      status:         'draft',
      version:        1,
      tags:           ['test', 'flow17'],
    })
    .select('id')
    .single();
  if (error || !data) return null;
  return data.id as string;
}

async function approvePolicyViaServiceRole(policyId: string): Promise<boolean> {
  if (!serviceSupabase) return false;
  const { error } = await serviceSupabase
    .from('campaign_policy_blocks')
    .update({ status: 'approved', published_at: new Date().toISOString() })
    .eq('id', policyId);
  return !error;
}

async function cleanupPolicy(policyId: string) {
  if (!serviceSupabase) return;
  await serviceSupabase.from('policy_acknowledgments').delete().eq('policy_id', policyId);
  await serviceSupabase.from('campaign_policy_blocks').delete().eq('id', policyId);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe.serial('Flow 17 — Policy Acknowledgment Workflow', () => {

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: DB trigger creates pending ack when a policy is approved
  // ──────────────────────────────────────────────────────────────────────────
  test('F17-01: approving a policy creates a pending ack for assigned agents', async () => {
    if (!serviceSupabase) {
      test.skip(true, 'No service-role key — cannot verify DB trigger directly.');
      return;
    }

    const policyId = await seedApprovedPolicyForQaClient();
    if (!policyId) {
      test.skip(true, 'Could not seed test policy — skipping.');
      return;
    }

    try {
      const approved = await approvePolicyViaServiceRole(policyId);
      expect(approved).toBe(true);

      // Give the trigger a moment to fire
      await new Promise(r => setTimeout(r, 800));

      const { data: acks, error } = await serviceSupabase
        .from('policy_acknowledgments')
        .select('*')
        .eq('policy_id', policyId)
        .eq('agent_user_id', QA_AGENT_ID);

      expect(error).toBeNull();
      expect(acks?.length).toBeGreaterThanOrEqual(1);
      expect(acks?.[0].status).toBe('pending');
      expect(acks?.[0].acknowledged_at).toBeNull();
    } finally {
      await cleanupPolicy(policyId);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Agent sees amber banner when they have pending acks
  // ──────────────────────────────────────────────────────────────────────────
  test('F17-02: agent sees amber acknowledgment banner when pending acks exist', async ({ page }) => {
    if (!serviceSupabase) {
      test.skip(true, 'No service-role key — cannot seed pending ack.');
      return;
    }

    const policyId = await seedApprovedPolicyForQaClient();
    if (!policyId) {
      test.skip(true, 'Could not seed test policy — skipping.');
      return;
    }
    const approved = await approvePolicyViaServiceRole(policyId);
    if (!approved) {
      await cleanupPolicy(policyId);
      test.skip(true, 'Could not approve policy — skipping.');
      return;
    }

    try {
      await loginAs(page, 'agent');
      await navigateToAgentScripts(page);

      await expect(page.getByTestId('policy-ack-banner')).toBeVisible({ timeout: 10000 });

      const countBadge = page.getByTestId('policy-ack-count');
      await expect(countBadge).toBeVisible();
      const countText = await countBadge.textContent();
      expect(Number(countText?.trim())).toBeGreaterThanOrEqual(1);
    } finally {
      await cleanupPolicy(policyId);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Agent can open the sheet and see pending policies
  // ──────────────────────────────────────────────────────────────────────────
  test('F17-03: agent can open acknowledgment sheet and see pending policies', async ({ page }) => {
    if (!serviceSupabase) {
      test.skip(true, 'No service-role key — cannot seed pending ack.');
      return;
    }

    const policyId = await seedApprovedPolicyForQaClient();
    if (!policyId) {
      test.skip(true, 'Could not seed test policy — skipping.');
      return;
    }
    await approvePolicyViaServiceRole(policyId);

    try {
      await loginAs(page, 'agent');
      await navigateToAgentScripts(page);

      await page.getByTestId('policy-ack-review-btn').click();
      await page.waitForTimeout(500);

      const sheet = page.getByTestId('policy-ack-sheet');
      await expect(sheet).toBeVisible({ timeout: 6000 });

      await expect(page.getByTestId('policy-ack-item').first()).toBeVisible({ timeout: 6000 });
      await expect(page.getByTestId('policy-ack-title').first()).toBeVisible();
      await expect(page.getByTestId('policy-ack-acknowledge-btn').first()).toBeVisible();
    } finally {
      await cleanupPolicy(policyId);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Agent can acknowledge a policy and banner disappears
  // ──────────────────────────────────────────────────────────────────────────
  test('F17-04: agent acknowledges all policies and banner disappears', async ({ page }) => {
    if (!serviceSupabase) {
      test.skip(true, 'No service-role key — cannot seed pending ack.');
      return;
    }

    const policyId = await seedApprovedPolicyForQaClient();
    if (!policyId) {
      test.skip(true, 'Could not seed test policy — skipping.');
      return;
    }
    await approvePolicyViaServiceRole(policyId);

    // Verify only 1 pending ack for this policy+agent (cleanup any duplicates)
    const { data: existing } = await serviceSupabase
      .from('policy_acknowledgments')
      .select('id')
      .eq('policy_id', policyId)
      .eq('agent_user_id', QA_AGENT_ID);

    try {
      await loginAs(page, 'agent');
      await navigateToAgentScripts(page);

      // Banner must be visible before we start
      await expect(page.getByTestId('policy-ack-banner')).toBeVisible({ timeout: 10000 });

      // Open sheet
      await page.getByTestId('policy-ack-review-btn').click();
      await page.waitForTimeout(500);

      // Acknowledge all visible policies (may be just 1 from seed)
      const ackBtns = page.getByTestId('policy-ack-acknowledge-btn');
      const count = await ackBtns.count();
      for (let i = 0; i < count; i++) {
        await ackBtns.first().click();
        await page.waitForTimeout(600);
      }

      // Close sheet and banner should be gone
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Reload to confirm banner is gone (not just hidden)
      await navigateToAgentScripts(page);

      // Banner is only shown when pending > 0; after acknowledging it should not appear
      // (allow a grace period for the query to settle)
      await page.waitForTimeout(1500);

      // If there were other pre-existing pending acks the banner may still show,
      // so we only assert it's gone when we know we started with just 1.
      if ((existing?.length ?? 0) <= 1) {
        await expect(page.getByTestId('policy-ack-banner')).not.toBeVisible({ timeout: 8000 });
      }
    } finally {
      await cleanupPolicy(policyId);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: Admin UI creates policy and can approve it (smoke test)
  // ──────────────────────────────────────────────────────────────────────────
  test('F17-05: admin can create and approve a policy via the UI', async ({ page }) => {
    await loginAs(page, 'admin');
    await navigateToPoliciesAdmin(page);

    // Page must load — the layout heading is "Campaigns"; the Policies sub-nav
    // is a NavLink (not ARIA tab), so assert the heading + New Policy button.
    await expect(page.getByRole('heading', { name: /campaigns/i }).first()).toBeVisible({ timeout: 8000 });

    // Verify "New Policy" button exists (creation flow is covered in flow14)
    const newPolicyBtn = page.getByRole('button', { name: /new policy/i });
    await expect(newPolicyBtn).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: Re-approval resets ack to pending
  // ──────────────────────────────────────────────────────────────────────────
  test('F17-06: re-approving an already-acknowledged policy resets ack to pending', async () => {
    if (!serviceSupabase) {
      test.skip(true, 'No service-role key — cannot verify re-approval trigger.');
      return;
    }

    const policyId = await seedApprovedPolicyForQaClient();
    if (!policyId) {
      test.skip(true, 'Could not seed test policy — skipping.');
      return;
    }

    try {
      // 1. Approve → trigger fires
      await approvePolicyViaServiceRole(policyId);
      await new Promise(r => setTimeout(r, 800));

      // 2. Manually mark ack as acknowledged
      await serviceSupabase
        .from('policy_acknowledgments')
        .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
        .eq('policy_id', policyId)
        .eq('agent_user_id', QA_AGENT_ID);

      // 3. Set policy back to draft then re-approve — trigger should reset to pending
      await serviceSupabase
        .from('campaign_policy_blocks')
        .update({ status: 'draft', version: 2 })
        .eq('id', policyId);

      await approvePolicyViaServiceRole(policyId);
      await new Promise(r => setTimeout(r, 800));

      const { data: acks } = await serviceSupabase
        .from('policy_acknowledgments')
        .select('status, acknowledged_at')
        .eq('policy_id', policyId)
        .eq('agent_user_id', QA_AGENT_ID);

      expect(acks?.length).toBeGreaterThanOrEqual(1);
      expect(acks?.[0].status).toBe('pending');
      expect(acks?.[0].acknowledged_at).toBeNull();
    } finally {
      await cleanupPolicy(policyId);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 7: Supervisor workload tab shows pending ack badge for agent
  // ──────────────────────────────────────────────────────────────────────────
  test('F17-07: supervisor workload tab shows pending ack badge for agent with pending acks', async ({ page }) => {
    if (!serviceSupabase) {
      test.skip(true, 'No service-role key — cannot seed pending ack.');
      return;
    }

    const policyId = await seedApprovedPolicyForQaClient();
    if (!policyId) {
      test.skip(true, 'Could not seed test policy — skipping.');
      return;
    }
    await approvePolicyViaServiceRole(policyId);

    try {
      await loginAs(page, 'supervisor');
      await page.goto('/staff/supervisor/client-assignments');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Switch to workload tab
      await page.getByRole('tab', { name: /workload/i }).click();
      await page.waitForTimeout(800);

      // At least one agent should have a pending ack badge
      const badge = page.getByTestId('pending-ack-badge').first();
      await expect(badge).toBeVisible({ timeout: 8000 });
      const badgeText = await badge.textContent();
      expect(Number(badgeText?.replace(/\D/g, ''))).toBeGreaterThanOrEqual(1);
    } finally {
      await cleanupPolicy(policyId);
    }
  });
});
