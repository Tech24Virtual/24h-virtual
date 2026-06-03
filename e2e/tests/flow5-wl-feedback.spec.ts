import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

let feedbackTitle: string;

test.describe.serial('Flow 5 — WL Partner Feedback Lifecycle', () => {

  test.beforeAll(() => {
    feedbackTitle = `WL QA Feedback ${Date.now()}`;
  });

  // ─────────────────────────────────────────
  // TEST 1: WL partner submits product feedback via widget
  // ─────────────────────────────────────────
  test('F5-01: WL partner can submit product feedback via widget', async ({ page }) => {
    await loginAs(page, 'wlOwner');
    await expect(page).toHaveURL(/white-label-dashboard/, { timeout: 15000 });

    await page.goto('/white-label-dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Dismiss any modals
    try {
      await page.getByRole('button', { name: 'Skip Tour' }).click({ timeout: 3000, force: true });
      await page.waitForTimeout(500);
    } catch { /* no modal */ }

    // Open feedback widget
    await page.getByRole('button', { name: 'Send feedback' }).click();
    await page.waitForTimeout(500);

    // Dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

    // WL partner sees intent selector — choose "product" (send to platform)
    const productIntent = page.getByRole('radio', { name: /product/i });
    if (await productIntent.isVisible({ timeout: 2000 }).catch(() => false)) {
      await productIntent.click();
      await page.waitForTimeout(300);
    }

    // Fill title
    await page.getByPlaceholder('Short summary').fill(feedbackTitle);

    // Fill details
    await page.getByPlaceholder("Tell us what happened or what you'd like to see").fill(
      'Automated WL QA feedback test. Please ignore. ' + feedbackTitle
    );

    // Submit — button text varies for WL partner
    const submitBtn = page.getByRole('button', { name: /submit|send|platform|queue/i }).last();
    await submitBtn.click();
    await page.waitForTimeout(3000);
  });

  // ─────────────────────────────────────────
  // TEST 2: Feedback appears in WL feedback page
  // ─────────────────────────────────────────
  test('F5-02: Submitted feedback appears in WL feedback page', async ({ page }) => {
    await loginAs(page, 'wlOwner');

    await page.goto('/white-label-dashboard/feedback');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click "My product feedback to platform" tab
    await page.getByRole('tab', { name: /product feedback/i }).click();
    await page.waitForTimeout(1000);

    await expect(page.getByText(feedbackTitle).first())
      .toBeVisible({ timeout: 15000 });
  });

  // ─────────────────────────────────────────
  // TEST 3: Admin can see WL partner feedback
  // ─────────────────────────────────────────
  test('F5-03: Admin can see WL partner feedback in admin panel', async ({ page }) => {
    await loginAs(page, 'admin');

    await page.goto('/admin/feedback');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Search for our feedback
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill(feedbackTitle);
      await page.waitForTimeout(1500);
    }

    await expect(page.getByText(feedbackTitle).first())
      .toBeVisible({ timeout: 15000 });
  });

  // ─────────────────────────────────────────
  // TEST 4: Direct client cannot see WL partner feedback
  // ─────────────────────────────────────────
  test('F5-04: Direct client cannot see WL partner feedback', async ({ page }) => {
    await loginAs(page, 'client');

    await page.goto('/client-dashboard/feedback');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // WL partner feedback should NOT appear for direct client
    await expect(page.getByText(feedbackTitle)).not.toBeVisible();
  });

  // ─────────────────────────────────────────
  // TEST 5: WL partner cannot access admin feedback panel
  // ─────────────────────────────────────────
  test('F5-05: WL partner cannot access admin feedback panel', async ({ page }) => {
    await loginAs(page, 'wlOwner');

    await page.goto('/admin/feedback');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL('/admin/feedback');
  });

});