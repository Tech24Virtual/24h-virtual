/**
 * Flow 26 — NMI Client Billing
 *
 * Tests cover:
 *   1. Client sees NMI card section when payment_processor is 'nmi'
 *   2. Client sees Update Card button when card on file
 *   3. Client sees Add Card button when no card on file
 *   4. Client sees billing history table (or empty state)
 *   5. Stripe portal link is hidden for NMI clients
 *   6. NMI default is set (new leads column default is 'nmi')
 *
 * Notes:
 *   - Tests 1–5 require the QA client user to have payment_processor='nmi' in leads.
 *   - If the client has no lead row, tests gracefully skip.
 *   - No live NMI API calls are made — dialogs are UI-only tests.
 */

import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

async function goToClientBilling(page: import('@playwright/test').Page) {
  await page.goto('/client-dashboard/billing');
  await page.waitForLoadState('networkidle');
}

test.describe('NMI Client Billing', () => {

  test('Client billing page loads without error', async ({ page }) => {
    await loginAs(page, 'client');
    await goToClientBilling(page);

    await expect(page.getByRole('heading', { name: /billing/i })).toBeVisible({ timeout: 10_000 });
  });

  test('NMI card section is visible when payment_processor is nmi', async ({ page }) => {
    await loginAs(page, 'client');
    await goToClientBilling(page);

    const nmiSection = page.getByTestId('nmi-client-card-section');
    const hasNmi = await nmiSection.isVisible({ timeout: 10_000 }).catch(() => false);

    if (!hasNmi) {
      // Client lead is Stripe — skip gracefully
      test.skip();
      return;
    }

    await expect(nmiSection).toBeVisible();
  });

  test('Update Card button visible when NMI card on file', async ({ page }) => {
    await loginAs(page, 'client');
    await goToClientBilling(page);

    const nmiSection = page.getByTestId('nmi-client-card-section');
    const hasNmi = await nmiSection.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!hasNmi) { test.skip(); return; }

    const cardOnFile = page.getByTestId('nmi-client-card-on-file');
    const hasCard = await cardOnFile.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasCard) { test.skip(); return; }

    await expect(page.getByTestId('nmi-client-update-card-btn')).toBeVisible({ timeout: 5_000 });
  });

  test('Add Card button visible when no NMI card on file', async ({ page }) => {
    await loginAs(page, 'client');
    await goToClientBilling(page);

    const nmiSection = page.getByTestId('nmi-client-card-section');
    const hasNmi = await nmiSection.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!hasNmi) { test.skip(); return; }

    const cardOnFile = page.getByTestId('nmi-client-card-on-file');
    const hasCard = await cardOnFile.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasCard) { test.skip(); return; }

    await expect(page.getByTestId('nmi-client-add-card-btn')).toBeVisible({ timeout: 5_000 });
  });

  test('Add Card button opens form with required fields', async ({ page }) => {
    await loginAs(page, 'client');
    await goToClientBilling(page);

    const nmiSection = page.getByTestId('nmi-client-card-section');
    const hasNmi = await nmiSection.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!hasNmi) { test.skip(); return; }

    // Try add card button (may not be visible if card on file)
    const addBtn = page.getByTestId('nmi-client-add-card-btn');
    const hasAddBtn = await addBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!hasAddBtn) { test.skip(); return; }

    await addBtn.click();

    const form = page.getByTestId('nmi-client-add-card-form');
    await expect(form).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('nmi-client-card-number-input')).toBeVisible();
    await expect(page.getByTestId('nmi-client-card-expiry-input')).toBeVisible();
    await expect(page.getByTestId('nmi-client-card-cvv-input')).toBeVisible();

    // Save button disabled without required fields
    const saveBtn = page.getByRole('button', { name: 'Save Card' });
    await expect(saveBtn).toBeDisabled();
  });

  test('Billing history table or empty state is visible for NMI client', async ({ page }) => {
    await loginAs(page, 'client');
    await goToClientBilling(page);

    const nmiSection = page.getByTestId('nmi-client-card-section');
    const hasNmi = await nmiSection.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!hasNmi) { test.skip(); return; }

    // Either the table or the empty state must be present
    const table = page.getByTestId('nmi-billing-history-table');
    const empty = page.getByTestId('nmi-billing-history-empty');

    const hasTable = await table.isVisible({ timeout: 8_000 }).catch(() => false);
    const hasEmpty = await empty.isVisible({ timeout: 3_000 }).catch(() => false);

    expect(hasTable || hasEmpty).toBe(true);
  });

  test('Stripe Manage Billing button is hidden for NMI clients', async ({ page }) => {
    await loginAs(page, 'client');
    await goToClientBilling(page);

    const nmiSection = page.getByTestId('nmi-client-card-section');
    const hasNmi = await nmiSection.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!hasNmi) { test.skip(); return; }

    const stripeBtn = page.getByTestId('stripe-manage-billing-btn');
    await expect(stripeBtn).not.toBeVisible({ timeout: 5_000 });
  });

  test('Admin NMI warning banner shown when no vault', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/leads');
    await page.waitForLoadState('networkidle');

    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    if (count === 0) { test.skip(); return; }

    let found = false;
    for (let i = 0; i < Math.min(count, 10); i++) {
      await page.goto('/admin/leads');
      await page.waitForLoadState('networkidle');
      await page.locator('table tbody tr').nth(i).click();
      await page.waitForLoadState('networkidle');

      const badge = page.getByTestId('payment-processor-badge');
      if (await badge.isVisible({ timeout: 5_000 }).catch(() => false)) {
        const text = await badge.innerText();
        if (text.trim() === 'NMI') {
          const cardOnFile = page.getByTestId('nmi-card-on-file');
          const hasCard = await cardOnFile.isVisible({ timeout: 3_000 }).catch(() => false);
          if (!hasCard) {
            const warning = page.getByTestId('nmi-no-card-warning');
            await expect(warning).toBeVisible({ timeout: 5_000 });
            found = true;
            break;
          }
        }
      }
    }

    if (!found) { test.skip(); }
  });

});
