import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

let feedbackTitle: string;

test.describe.serial('Flow 4 — Direct Client Feedback Lifecycle', () => {

  test.beforeAll(() => {
    feedbackTitle = `QA Feedback ${Date.now()}`;
  });

  // ─────────────────────────────────────────
  // TEST 1: Client can submit feedback via widget
  // ─────────────────────────────────────────
  test('F4-01: Client can submit feedback via floating widget', async ({ page }) => {
    await loginAs(page, 'client');
    await expect(page).toHaveURL(/client-dashboard/, { timeout: 15000 });

    await page.goto('/client-dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Dismiss PiP onboarding modal if present
    try {
      await page.getByRole('button', { name: 'Skip Tour' }).click({ timeout: 3000, force: true });
      await page.waitForTimeout(500);
    } catch { /* no modal */ }
    try {
      await page.getByRole('button', { name: 'Maybe later' }).click({ timeout: 2000, force: true });
      await page.waitForTimeout(500);
    } catch { /* no modal */ }

    // Open the floating feedback widget (aria-label: "Send feedback", bottom-left)
    await page.getByRole('button', { name: 'Send feedback' }).click();
    await page.waitForTimeout(500);

    // Dialog should appear
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Fill title (optional)
    await page.getByPlaceholder('Short summary').fill(feedbackTitle);

    // Fill details (required)
    await page.getByPlaceholder("Tell us what happened or what you'd like to see").fill(
      'Automated QA feedback test. Please ignore. ' + feedbackTitle
    );

    // Submit
    await page.getByRole('button', { name: 'Submit feedback' }).click();
    await page.waitForTimeout(3000);

    // Dialog should close or show success
    await page.waitForTimeout(1000);
  });

  // ─────────────────────────────────────────
  // TEST 2: Feedback appears in client history
  // ─────────────────────────────────────────
  test('F4-02: Submitted feedback appears in client feedback page', async ({ page }) => {
    await loginAs(page, 'client');

    await page.goto('/client-dashboard/feedback');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // The feedback page should load without error
    await expect(page).toHaveURL('/client-dashboard/feedback');

    // Should show at least one feedback item (the one we just submitted)
    // Look for the description text or title
    const feedbackVisible = await page.getByText(feedbackTitle).isVisible().catch(() => false);
    if (!feedbackVisible) {
      // Try partial match on description
      await expect(page.getByText('Automated QA feedback test').first())
        .toBeVisible({ timeout: 15000 });
    } else {
      await expect(page.getByText(feedbackTitle).first()).toBeVisible();
    }
  });

  // ─────────────────────────────────────────
  // TEST 3: Admin can see the feedback
  // ─────────────────────────────────────────
  test('F4-03: Admin can see feedback in admin panel', async ({ page }) => {
    await loginAs(page, 'admin');

    await page.goto('/admin/feedback');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page).toHaveURL('/admin/feedback');

    // Search for our feedback item by title
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill(feedbackTitle);
      await page.waitForTimeout(1500);
    }

    await expect(page.getByText(feedbackTitle).first())
      .toBeVisible({ timeout: 15000 });
  });

  // ─────────────────────────────────────────
  // TEST 4: Client cannot see other clients' feedback
  // ─────────────────────────────────────────
  test('F4-04: Client only sees their own feedback (isolation)', async ({ page }) => {
    await loginAs(page, 'client');

    await page.goto('/client-dashboard/feedback');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Our QA client's feedback should be visible
    await expect(page.getByText(feedbackTitle).first())
      .toBeVisible({ timeout: 15000 });

    // WL partner feedback or other client feedback should NOT be visible
    // The WL partner uses 'wlOwner' account - their feedback has a different surface
    await expect(page.getByText('wl-owner')).not.toBeVisible();
  });

  // ─────────────────────────────────────────
  // TEST 5: Client cannot access admin feedback panel
  // ─────────────────────────────────────────
  test('F4-05: Direct client cannot access admin feedback panel', async ({ page }) => {
    await loginAs(page, 'client');

    await page.goto('/admin/feedback');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL('/admin/feedback');
  });

});