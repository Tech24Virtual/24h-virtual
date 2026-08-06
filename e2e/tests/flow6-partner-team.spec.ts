import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { createClient } from '@supabase/supabase-js';

// ── Supabase service-role client (only available in test environment) ─────────
// Used to clean up the pending invite row created by F6-04 without going
// through the UI (same pattern as flow17-policy-acknowledgment.spec.ts).
const SUPABASE_URL    = process.env.VITE_SUPABASE_URL    ?? process.env.SUPABASE_URL    ?? '';
const SUPABASE_SK     = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const serviceSupabase = SUPABASE_URL && SUPABASE_SK
  ? createClient(SUPABASE_URL, SUPABASE_SK, { auth: { persistSession: false } })
  : null;

test.describe.serial('Flow 6 — Partner Team Management', () => {
    // Set by F6-04 once it creates the pending invite, so afterAll can remove it.
    let createdInviteEmail: string | null = null;

    test.afterAll(async () => {
        if (!serviceSupabase || !createdInviteEmail) return;
        await serviceSupabase.from('wl_partner_members').delete().eq('invited_email', createdInviteEmail);
    });

    test('F6-01: Team page shows existing members', async ({ page }) => {
        await loginAs(page, 'wlOwner');
        await page.goto('/white-label-dashboard/team');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        await expect(page.getByRole('heading', { name: 'Team', exact: true })).toBeVisible();

        // Should show at least the owner and manager seeded members
        await expect(page.getByText('owner').first()).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('manager').first()).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('active').first()).toBeVisible({ timeout: 10000 });
    });

    test('F6-02: Invite Member button opens form', async ({ page }) => {
        await loginAs(page, 'wlOwner');
        await page.goto('/white-label-dashboard/team');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        await page.getByRole('button', { name: 'Invite Member' }).click();
        await page.waitForTimeout(300);

        // Invite form should appear
        await expect(page.getByPlaceholder('teammate@example.com')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Send Invite' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    });

    test('F6-03: Send Invite button disabled when email is empty', async ({ page }) => {
        await loginAs(page, 'wlOwner');
        await page.goto('/white-label-dashboard/team');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        await page.getByRole('button', { name: 'Invite Member' }).click();
        await page.waitForTimeout(300);

        // Send Invite should be disabled with no email
        await expect(page.getByRole('button', { name: 'Send Invite' })).toBeDisabled();

        // Type email — button should enable
        await page.getByPlaceholder('teammate@example.com').fill('newmember@example.com');
        await expect(page.getByRole('button', { name: 'Send Invite' })).toBeEnabled();
    });

    test('F6-04: Inviting a member adds them with pending status', async ({ page }) => {
        await loginAs(page, 'wlOwner');
        await page.goto('/white-label-dashboard/team');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const testEmail = `qa-flow6-${Date.now()}@example.com`;
        createdInviteEmail = testEmail;

        await page.getByRole('button', { name: 'Invite Member' }).click();
        await page.waitForTimeout(300);

        await page.getByPlaceholder('teammate@example.com').fill(testEmail);

        // Change role to manager (scope to the invite form's own Role select —
        // the Team table now has a per-row role combobox on every member, so an
        // unscoped getByRole('combobox') matches ambiguously)
        await page.locator('div.space-y-2.w-40').getByRole('combobox').click();
        await page.getByRole('option', { name: 'Manager' }).click();
        await page.waitForTimeout(200);

        await page.getByRole('button', { name: 'Send Invite' }).click();
        await page.waitForTimeout(2000);

        // Success toast — asserting on "Invite recorded" (fires immediately after the DB
        // insert) rather than "Invite sent" (only fires if the invite-user edge function
        // succeeds, which isn't guaranteed in CI/staging)
        await expect(page.getByText('Invite recorded', { exact: true })).toBeVisible({ timeout: 10000 });

        // New member appears in table with pending status
        await expect(page.getByText(testEmail).first()).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('pending').first()).toBeVisible();
    });

    test('F6-05: Partner B cannot see Partner A team members', async ({ page }) => {
        await loginAs(page, 'wlPartnerB');
        await page.goto('/white-label-dashboard/team');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);

        // Partner B should see their own team only (not Partner A's members)
        // Partner A members have emails containing "qa-wl-owner" or "qa-wl-manager"
        await expect(page.getByText('qa-wl-owner@24hv-test.com')).not.toBeVisible();
        await expect(page.getByText('qa-wl-manager@24hv-test.com')).not.toBeVisible();
    });

});