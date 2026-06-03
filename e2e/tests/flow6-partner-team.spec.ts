import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe.serial('Flow 6 — Partner Team Management', () => {

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

        await page.getByRole('button', { name: 'Invite Member' }).click();
        await page.waitForTimeout(300);

        await page.getByPlaceholder('teammate@example.com').fill(testEmail);

        // Change role to manager
        await page.getByRole('combobox').click();
        await page.getByRole('option', { name: 'Manager' }).click();
        await page.waitForTimeout(200);

        await page.getByRole('button', { name: 'Send Invite' }).click();
        await page.waitForTimeout(2000);

        // Success toast
        await expect(page.getByText('Invite Sent')).toBeVisible({ timeout: 10000 });

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