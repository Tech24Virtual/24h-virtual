/**
 * Flow 30 — admin partners page smoke test
 *
 * Quick verification for the AdminPartners.tsx fixes: the page loads, each
 * tab's table renders, and the row action dropdown opens with the newly
 * wired-up menu items (View Referrals / Approve + View Application /
 * Contact Referrer). Skips a tab's dropdown assertions gracefully if that
 * tab has no rows on the current environment.
 */

import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('admin partners page smoke', () => {
  test('admin partners page loads and dropdown actions are clickable', async ({ page }) => {
    await loginAs(page, 'admin');

    await page.goto('/admin/partners');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Partner Management' })).toBeVisible();

    // Affiliates tab (default) — dropdown should include the wired "View Referrals" item
    const affiliateRow = page.locator('table tbody tr').first();
    if (await affiliateRow.count() > 0) {
      await affiliateRow.getByRole('button').click();
      await expect(page.getByRole('menuitem', { name: 'View Referrals' })).toBeVisible();
      await page.keyboard.press('Escape');
    }

    // White Label tab — "Approve" (no longer "Approve & Create Dashboard") + wired "View Application"
    await page.getByRole('tab', { name: 'White Label' }).click();
    await page.waitForLoadState('networkidle');
    const wlRow = page.locator('table tbody tr').first();
    if (await wlRow.count() > 0) {
      await wlRow.getByRole('button').click();
      await expect(page.getByRole('menuitem', { name: 'Approve', exact: true })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: 'View Application' })).toBeVisible();
      await page.keyboard.press('Escape');
    }

    // Referrals tab — wired "Contact Referrer" mailto item
    await page.getByRole('tab', { name: 'Referrals' }).click();
    await page.waitForLoadState('networkidle');
    const referralRow = page.locator('table tbody tr').first();
    if (await referralRow.count() > 0) {
      await referralRow.getByRole('button').click();
      await expect(page.getByRole('menuitem', { name: 'Contact Referrer' })).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });
});
