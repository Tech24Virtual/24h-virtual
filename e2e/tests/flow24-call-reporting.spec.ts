/**
 * Flow 24 — Call Reporting (Five9 Hybrid Part B)
 *
 * Tests cover:
 *   1. Admin can navigate to the call report page for a client (via lead detail)
 *   2. Summary cards render on the call report page (empty state acceptable)
 *   3. Disposition chart container renders
 *   4. Export CSV button is visible on the admin report page
 *   5. Client can navigate to their own Call Reports page
 *   6. Client summary cards render (empty state acceptable)
 *   7. Client disposition chart container renders
 *   8. Client Export CSV button is visible
 *
 * No live Five9 data is required — all tests work against an empty call_logs state.
 */

import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

// ─────────────────────────────────────────────────────────────────────────────
// Admin — navigate to call report via lead detail
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Admin — Call Report page', () => {

  test('Admin can navigate to the call report page from lead detail', async ({ page }) => {
    await loginAs(page, 'admin');

    // Navigate to the leads list to find a lead
    await page.goto('/admin/leads');
    await page.waitForLoadState('networkidle');

    // Click the first lead row — opens the LeadDetailSheet (quick view), not a navigation
    const firstLeadRow = page.locator('table tbody tr').first();
    await firstLeadRow.click();

    // Follow the sheet's "View Full Profile" link to reach the full lead detail page
    const viewFullProfileLink = page.getByRole('link', { name: /view full profile/i });
    await expect(viewFullProfileLink).toBeVisible({ timeout: 10_000 });
    await viewFullProfileLink.click();
    await page.waitForLoadState('networkidle');

    // The "View Call Report" button should be visible
    await expect(page.getByTestId('view-call-report-btn')).toBeVisible({ timeout: 10_000 });

    // Click it
    await page.getByTestId('view-call-report-btn').click();
    await page.waitForLoadState('networkidle');

    // Should land on the call report page
    await expect(page.getByTestId('call-report-page')).toBeVisible({ timeout: 10_000 });
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/something went wrong/i);
  });

  test('Admin call report page loads without errors when navigated directly', async ({ page }) => {
    await loginAs(page, 'admin');

    // Find a lead ID first
    await page.goto('/admin/leads');
    await page.waitForLoadState('networkidle');

    // Try to extract a lead ID from the page URLs or just navigate directly to a known path
    // and check the page structure (not data) renders correctly
    const links = await page.locator('table tbody tr').count();
    if (links === 0) {
      // No leads in DB — navigate to an arbitrary UUID path to check route loads
      await page.goto('/admin/clients/00000000-0000-0000-0000-000000000001/call-report');
      await page.waitForLoadState('networkidle');
      await expect(page.getByTestId('call-report-page')).toBeVisible({ timeout: 10_000 });
      return;
    }

    // Click the first lead row — opens the LeadDetailSheet (quick view), not a navigation
    await page.locator('table tbody tr').first().click();

    // Extract the lead ID from the sheet's "View Full Profile" link href
    const viewFullProfileLink = page.getByRole('link', { name: /view full profile/i });
    await expect(viewFullProfileLink).toBeVisible({ timeout: 10_000 });
    const href = await viewFullProfileLink.getAttribute('href');
    const match = href?.match(/leads\/([0-9a-f-]+)/i);
    const leadId = match?.[1];

    if (leadId) {
      await page.goto(`/admin/clients/${leadId}/call-report`);
      await page.waitForLoadState('networkidle');
    }

    await expect(page.getByTestId('call-report-page')).toBeVisible({ timeout: 10_000 });
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/something went wrong/i);
  });

  test('Summary cards render on admin call report page', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/clients/00000000-0000-0000-0000-000000000001/call-report');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('call-report-page')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('summary-cards')).toBeVisible({ timeout: 8_000 });

    // Cards should show numeric values (0 for empty state is fine)
    const cards = page.getByTestId('summary-cards').locator('[class*="text-2xl"]');
    await expect(cards.first()).toBeVisible();
  });

  test('Disposition chart container renders on admin call report page', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/clients/00000000-0000-0000-0000-000000000001/call-report');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('call-report-page')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('disposition-chart')).toBeVisible({ timeout: 8_000 });
  });

  test('Export CSV button is visible on admin call report page', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/clients/00000000-0000-0000-0000-000000000001/call-report');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('call-report-page')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('export-csv-btn')).toBeVisible({ timeout: 8_000 });
  });

  test('Period picker is visible and functional', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/clients/00000000-0000-0000-0000-000000000001/call-report');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('period-picker')).toBeVisible({ timeout: 8_000 });
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Client — Call Reports page
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Client — Call Reports page', () => {

  test('Client can navigate to the Call Reports page', async ({ page }) => {
    await loginAs(page, 'client');

    // The client sidebar is a collapsed icon rail — navigate directly to the route
    await page.goto('/client-dashboard/reports');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('client-reports-page')).toBeVisible({ timeout: 10_000 });

    // Confirm the page heading renders
    await expect(page.getByRole('heading', { name: /call reports/i })).toBeVisible({ timeout: 5_000 });

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/something went wrong/i);
  });

  test('Client summary cards render (empty state acceptable)', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/client-dashboard/reports');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('client-reports-page')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('client-summary-cards')).toBeVisible({ timeout: 8_000 });

    const cards = page.getByTestId('client-summary-cards').locator('[class*="text-2xl"]');
    await expect(cards.first()).toBeVisible();
  });

  test('Disposition chart container renders on client reports page', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/client-dashboard/reports');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('client-reports-page')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('client-disposition-chart')).toBeVisible({ timeout: 8_000 });
  });

  test('Export CSV button is visible on client reports page', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/client-dashboard/reports');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('client-reports-page')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('client-export-csv-btn')).toBeVisible({ timeout: 8_000 });
  });

});
