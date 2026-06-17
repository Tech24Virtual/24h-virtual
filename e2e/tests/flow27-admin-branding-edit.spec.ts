/**
 * Flow 27 — Admin Branding Edit
 *
 * Verifies that an admin can navigate to a WL partner's detail page,
 * open the Branding tab, view and edit branding fields, and save successfully.
 *
 * Tests:
 *   1. Admin sees Branding tab on partner detail page
 *   2. Branding form loads with current values (form sections are visible)
 *   3. Admin can edit company name and save — success toast appears
 *   4. Preview Portal link is visible and points to /admin/wl-preview/
 *   5. Email branding fields are visible
 */

import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

// Shared URL resolved in test 1 — each test independently navigates via the
// partners list so serial retries don't depend on prior-test state.
let partnerDetailUrl: string;

async function navigateToFirstWLPartner(page: Parameters<typeof loginAs>[0]) {
  await page.goto('/admin/partners');
  await page.waitForLoadState('networkidle');

  // Switch to the White Label tab — default is Affiliates
  await page.getByRole('tab', { name: 'White Label' }).click();
  await page.waitForLoadState('networkidle');

  // Each partner row has a single ghost icon button (MoreHorizontal) as the action menu
  const firstRowMenuBtn = page.locator('table tbody tr').first().getByRole('button');
  await firstRowMenuBtn.waitFor({ timeout: 15000 });
  await firstRowMenuBtn.click();

  // "Manage Partner" is a DropdownMenuItem (role=menuitem)
  await page.getByRole('menuitem', { name: 'Manage Partner' }).click();

  await page.waitForURL(url => url.toString().includes('/admin/partners/'), { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

test.describe.serial('Flow 27 — Admin Branding Edit', () => {

  // ── Test 1: Branding tab is visible on partner detail page ──────────────────
  test('admin sees Branding tab on partner detail page', async ({ page }) => {
    await loginAs(page, 'admin');
    await navigateToFirstWLPartner(page);

    partnerDetailUrl = page.url();

    const brandingTab = page.getByRole('tab', { name: 'Branding' });
    await expect(brandingTab).toBeVisible();
  });

  // ── Test 2: Branding form loads with visible sections ───────────────────────
  test('branding form loads with visible sections', async ({ page }) => {
    await loginAs(page, 'admin');

    if (partnerDetailUrl) {
      await page.goto(partnerDetailUrl);
      await page.waitForLoadState('networkidle');
    } else {
      await navigateToFirstWLPartner(page);
    }

    await page.getByRole('tab', { name: 'Branding' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('admin-branding-tab')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('section-identity')).toBeVisible();
    await expect(page.getByTestId('section-visual')).toBeVisible();
    await expect(page.getByTestId('section-portal-copy')).toBeVisible();
    await expect(page.getByTestId('section-typography')).toBeVisible();
    await expect(page.getByTestId('input-company-name')).toBeVisible();
  });

  // ── Test 3: Admin can edit company name and save ─────────────────────────────
  test('admin can edit company name and save successfully', async ({ page }) => {
    await loginAs(page, 'admin');

    if (partnerDetailUrl) {
      await page.goto(partnerDetailUrl);
      await page.waitForLoadState('networkidle');
    } else {
      await navigateToFirstWLPartner(page);
    }

    await page.getByRole('tab', { name: 'Branding' }).click();

    const companyNameInput = page.getByTestId('input-company-name');
    await companyNameInput.waitFor({ timeout: 10000 });

    await companyNameInput.clear();
    await companyNameInput.fill('Admin Test Co');

    await page.getByTestId('save-branding-btn').click();

    await expect(page.getByText('Branding saved')).toBeVisible({ timeout: 10000 });
  });

  // ── Test 4: Preview Portal link is visible and correct ──────────────────────
  test('Preview Portal link is visible and links to wl-preview', async ({ page }) => {
    await loginAs(page, 'admin');

    if (partnerDetailUrl) {
      await page.goto(partnerDetailUrl);
      await page.waitForLoadState('networkidle');
    } else {
      await navigateToFirstWLPartner(page);
    }

    await page.getByRole('tab', { name: 'Branding' }).click();
    await page.getByTestId('admin-branding-tab').waitFor({ timeout: 10000 });

    const previewLink = page.getByTestId('preview-portal-link');
    await expect(previewLink).toBeVisible();

    const href = await previewLink.getAttribute('href');
    expect(href).toContain('/admin/wl-preview/');
  });

  // ── Test 5: Email branding fields are visible ────────────────────────────────
  test('email branding fields are visible', async ({ page }) => {
    await loginAs(page, 'admin');

    if (partnerDetailUrl) {
      await page.goto(partnerDetailUrl);
      await page.waitForLoadState('networkidle');
    } else {
      await navigateToFirstWLPartner(page);
    }

    await page.getByRole('tab', { name: 'Branding' }).click();
    await page.getByTestId('section-email-branding').waitFor({ timeout: 10000 });

    await expect(page.getByTestId('section-email-branding')).toBeVisible();
    await expect(page.getByTestId('input-email-from-name')).toBeVisible();
    await expect(page.getByTestId('input-email-from-address')).toBeVisible();
    await expect(page.getByTestId('input-email-reply-to')).toBeVisible();
    await expect(page.getByTestId('input-phone-greeting')).toBeVisible();
    await expect(page.getByTestId('input-email-footer')).toBeVisible();
  });
});
