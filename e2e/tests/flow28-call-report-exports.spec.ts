/**
 * Flow 28 — Call Report Exports (Five9 Hybrid Part C)
 *
 * Tests cover:
 *   1. Admin sees Export CSV, Export XLSX, and Export PDF buttons on the call report page
 *   2. Export CSV button is enabled (always — it does an early-exit internally when empty)
 *   3. Export XLSX button is visible
 *   4. Export PDF button is visible
 *   5. Export XLSX and PDF buttons are disabled while summary data is loading (empty-state test)
 *
 * No live Five9 data required — all tests work against an empty call_logs state.
 */

import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

const DUMMY_LEAD = '00000000-0000-0000-0000-000000000001';
const REPORT_URL = `/admin/clients/${DUMMY_LEAD}/call-report`;

test.describe('Admin — Call Report Export buttons (Part C)', () => {

  test('All three export buttons are visible on the call report page', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto(REPORT_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('call-report-page')).toBeVisible({ timeout: 10_000 });

    await expect(page.getByTestId('export-csv-btn')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId('export-xlsx-btn')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId('export-pdf-btn')).toBeVisible({ timeout: 8_000 });
  });

  test('Export CSV button is enabled regardless of data state', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto(REPORT_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('call-report-page')).toBeVisible({ timeout: 10_000 });
    const csvBtn = page.getByTestId('export-csv-btn');
    await expect(csvBtn).toBeVisible({ timeout: 8_000 });
    await expect(csvBtn).not.toBeDisabled();
  });

  test('Export XLSX button is visible', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto(REPORT_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('call-report-page')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('export-xlsx-btn')).toBeVisible({ timeout: 8_000 });
  });

  test('Export PDF button is visible', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto(REPORT_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('call-report-page')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('export-pdf-btn')).toBeVisible({ timeout: 8_000 });
  });

  test('Export XLSX and PDF buttons are disabled when no summary data is loaded', async ({ page }) => {
    await loginAs(page, 'admin');
    // Navigate to a guaranteed-empty-state lead ID
    await page.goto(REPORT_URL);
    // Check immediately after nav (before networkidle) — buttons should start disabled
    await expect(page.getByTestId('call-report-page')).toBeVisible({ timeout: 10_000 });

    // After load, with no data for the dummy lead, summary.data is null → buttons stay disabled
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('export-xlsx-btn')).toBeDisabled({ timeout: 8_000 });
    await expect(page.getByTestId('export-pdf-btn')).toBeDisabled({ timeout: 8_000 });
  });

  test('Period picker still visible alongside new export buttons', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto(REPORT_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('call-report-page')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('period-picker')).toBeVisible({ timeout: 8_000 });

    // All buttons still in the same row
    await expect(page.getByTestId('export-csv-btn')).toBeVisible();
    await expect(page.getByTestId('export-xlsx-btn')).toBeVisible();
    await expect(page.getByTestId('export-pdf-btn')).toBeVisible();
  });

});
