/**
 * Flow 23 — Five9 Report Pull
 *
 * Tests cover:
 *   1. Billing/admin user sees "Pull Five9 Reports" button on reconciliation page
 *   2. Clicking the button opens a dialog with date pickers
 *   3. Confirming triggers the pull-five9-call-report edge function
 *   4. A mission with type five9_report_pull is created
 *   5. Admin can see five9_report_pull missions in mission control
 *
 * NOTE: Tests 3–4 require live Five9 credentials and active client mappings.
 * They are skipped in CI. Tests 1–2 run against any staging state.
 */

import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

const isCI = !!process.env.CI;

// ─────────────────────────────────────────────────────────────────────────────
// Button visibility
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Billing — Pull Five9 Reports button', () => {

  test('Admin sees Pull Five9 Reports button on the reconciliation page', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/staff/billing/reconciliation');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('pull-five9-reports-btn')).toBeVisible({ timeout: 10_000 });

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/something went wrong/i);
  });

  test('Pull Five9 Reports and Run Reconciliation buttons are both visible', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/staff/billing/reconciliation');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('pull-five9-reports-btn')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('run-reconciliation-btn')).toBeVisible({ timeout: 10_000 });
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Dialog
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Billing — Pull Five9 Reports dialog', () => {

  test('Clicking the button opens a dialog with date inputs', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/staff/billing/reconciliation');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('pull-five9-reports-btn').click();

    await expect(page.getByTestId('pull-five9-dialog')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('five9-period-start')).toBeVisible();
    await expect(page.getByTestId('five9-period-end')).toBeVisible();
    await expect(page.getByTestId('confirm-pull-five9-btn')).toBeVisible();
  });

  test('Dialog can be dismissed with Cancel', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/staff/billing/reconciliation');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('pull-five9-reports-btn').click();
    await expect(page.getByTestId('pull-five9-dialog')).toBeVisible({ timeout: 5_000 });

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByTestId('pull-five9-dialog')).not.toBeVisible({ timeout: 3_000 });
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Edge function invocation + mission creation (requires live credentials)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Billing — Pull Five9 Reports invokes edge function', () => {

  test('Clicking Pull Reports triggers the edge function and shows a success toast', async ({ page }) => {
    test.skip(isCI, 'Skipped in CI — requires live Five9 credentials and active client mappings');

    await loginAs(page, 'admin');
    await page.goto('/staff/billing/reconciliation');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('pull-five9-reports-btn').click();
    await expect(page.getByTestId('pull-five9-dialog')).toBeVisible({ timeout: 5_000 });

    // Use a narrow range to keep the test fast
    await page.getByTestId('five9-period-start').fill('2026-01-01');
    await page.getByTestId('five9-period-end').fill('2026-01-31');

    await page.getByTestId('confirm-pull-five9-btn').click();

    // Dialog closes after function returns
    await expect(page.getByTestId('pull-five9-dialog')).not.toBeVisible({ timeout: 120_000 });

    // Toast confirms completion (use first() — notification bell may also match)
    await expect(page.getByText(/five9 pull/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('Mission with type five9_report_pull is created — verified via edge function response', async ({ page }) => {
    test.skip(isCI, 'Skipped in CI — requires live Five9 credentials');

    await loginAs(page, 'admin');
    await page.goto('/staff/billing/reconciliation');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('pull-five9-reports-btn').click();
    await expect(page.getByTestId('pull-five9-dialog')).toBeVisible({ timeout: 5_000 });

    // Intercept the edge function HTTP response — it contains mission_id in the body
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('pull-five9-call-report') && r.request().method() === 'POST',
        { timeout: 120_000 }
      ),
      page.getByTestId('confirm-pull-five9-btn').click(),
    ]);

    expect(response.ok()).toBe(true);
    const body = await response.json();

    // The function always creates a mission row first, before processing clients
    expect(body.mission_id).toBeTruthy();
    expect(['completed', 'needs_review', 'error']).toContain(body.status);

    // Dialog should close after response
    await expect(page.getByTestId('pull-five9-dialog')).not.toBeVisible({ timeout: 10_000 });
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Admin — Mission Control visibility
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Admin — Five9 pull missions in Mission Control', () => {

  test('Mission Control page loads without errors for admin', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/mission-control');
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/something went wrong/i);
    expect(bodyText).not.toMatch(/unexpected error/i);
  });

  test('five9_report_pull missions appear in Mission Control if any exist', async ({ page }) => {
    test.skip(isCI, 'Skipped in CI — requires a prior five9_report_pull mission to exist');

    await loginAs(page, 'admin');
    await page.goto('/admin/mission-control');
    await page.waitForLoadState('networkidle');

    // MissionsList is on the AI Agents tab
    await page.getByRole('tab', { name: /AI Agents/i }).click();
    await expect(page.getByText('Loading missions...')).toBeHidden({ timeout: 15_000 });

    const bodyText = await page.locator('body').innerText();
    const hasFive9Mission =
      bodyText.includes('five9_report_pull') ||
      bodyText.toLowerCase().includes('five9 report');

    test.skip(!hasFive9Mission, 'No five9_report_pull missions in DB yet — run the pull first');

    await expect(
      page.getByText(/five9 report pull|five9_report_pull/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

});
