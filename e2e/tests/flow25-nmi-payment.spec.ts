/**
 * Flow 25 — NMI Payment Integration
 *
 * Tests cover:
 *   1. Admin can see the NMI payment section on a lead's detail page
 *   2. Payment processor badge renders correctly
 *   3. Add Card form is visible and contains the correct fields
 *   4. Charge Now button is visible for NMI clients (state-gated)
 *   5. Card on file shows last 4 digits for NMI clients
 *
 * Notes:
 *   - Tests 1–3 work against any lead (section always renders).
 *   - Tests 4–5 require a lead with payment_processor='nmi' and nmi_customer_vault_id set.
 *     They are written to skip gracefully if no such lead exists in the staging DB.
 *   - No live NMI API calls are made — all card submission tests are UI-only.
 */

import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function navigateToFirstLead(page: import('@playwright/test').Page) {
  await page.goto('/admin/leads');
  await page.waitForLoadState('networkidle');

  const rows = page.locator('table tbody tr');
  const count = await rows.count();
  if (count === 0) return false;

  // Row click opens the LeadDetailSheet (quick view) — follow its
  // "View Full Profile" link to reach the full lead detail page, where
  // the NMI payment section actually lives.
  await rows.first().click();
  const viewFullProfileLink = page.getByRole('link', { name: /view full profile/i });
  await viewFullProfileLink.waitFor({ state: 'visible', timeout: 10_000 });
  await viewFullProfileLink.click();
  await page.waitForLoadState('networkidle');
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite
// ─────────────────────────────────────────────────────────────────────────────

test.describe('NMI Payment Integration', () => {

  test('Admin sees NMI payment section on lead billing tab', async ({ page }) => {
    await loginAs(page, 'admin');

    const haslead = await navigateToFirstLead(page);
    if (!haslead) {
      test.skip();
      return;
    }

    // The section should always render regardless of payment_processor value
    await expect(page.getByTestId('nmi-payment-section')).toBeVisible({ timeout: 10_000 });
  });

  test('Payment processor badge shows correctly', async ({ page }) => {
    await loginAs(page, 'admin');

    const hasLead = await navigateToFirstLead(page);
    if (!hasLead) {
      test.skip();
      return;
    }

    const badge = page.getByTestId('payment-processor-badge');
    await expect(badge).toBeVisible({ timeout: 10_000 });

    // Badge text must be either 'Stripe' or 'NMI'
    const text = await badge.innerText();
    expect(['Stripe', 'NMI']).toContain(text.trim());
  });

  test('Add Card button is visible and opens form with correct fields', async ({ page }) => {
    await loginAs(page, 'admin');

    const hasLead = await navigateToFirstLead(page);
    if (!hasLead) {
      test.skip();
      return;
    }

    await expect(page.getByTestId('nmi-payment-section')).toBeVisible({ timeout: 10_000 });

    // Click the Add Card button
    const addCardBtn = page.getByTestId('nmi-add-card-btn');
    await expect(addCardBtn).toBeVisible({ timeout: 5_000 });
    await addCardBtn.click();

    // Form dialog should open
    const form = page.getByTestId('nmi-add-card-form');
    await expect(form).toBeVisible({ timeout: 5_000 });

    // Required card fields must all be present
    await expect(page.getByTestId('nmi-card-number-input')).toBeVisible();
    await expect(page.getByTestId('nmi-card-expiry-input')).toBeVisible();
    await expect(page.getByTestId('nmi-card-cvv-input')).toBeVisible();
  });

  test('Add Card form rejects submission without required fields', async ({ page }) => {
    await loginAs(page, 'admin');

    const hasLead = await navigateToFirstLead(page);
    if (!hasLead) {
      test.skip();
      return;
    }

    await expect(page.getByTestId('nmi-payment-section')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('nmi-add-card-btn').click();
    await expect(page.getByTestId('nmi-add-card-form')).toBeVisible({ timeout: 5_000 });

    // Save button should be disabled when fields are empty
    const saveBtn = page.getByRole('button', { name: 'Save Card' });
    await expect(saveBtn).toBeDisabled();
  });

  test('Charge Now button is visible for NMI clients', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/leads');
    await page.waitForLoadState('networkidle');

    // Look for any lead with NMI processor by checking all lead rows
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    if (count === 0) {
      test.skip();
      return;
    }

    // Walk leads looking for one with NMI charge button
    let found = false;
    for (let i = 0; i < Math.min(count, 10); i++) {
      await page.goto('/admin/leads');
      await page.waitForLoadState('networkidle');
      // Row click opens the LeadDetailSheet — follow "View Full Profile" to
      // reach the full lead detail page where the NMI section lives.
      await page.locator('table tbody tr').nth(i).click();
      const viewFullProfileLink = page.getByRole('link', { name: /view full profile/i });
      if (!(await viewFullProfileLink.isVisible({ timeout: 5_000 }).catch(() => false))) continue;
      await viewFullProfileLink.click();
      await page.waitForLoadState('networkidle');

      const badge = page.getByTestId('payment-processor-badge');
      if (await badge.isVisible({ timeout: 5_000 })) {
        const text = await badge.innerText();
        if (text.trim() === 'NMI') {
          const chargeBtn = page.getByTestId('nmi-charge-now-btn');
          await expect(chargeBtn).toBeVisible({ timeout: 5_000 });
          found = true;
          break;
        }
      }
    }

    if (!found) {
      // No NMI client in staging DB yet — skip gracefully
      test.skip();
    }
  });

  test('Card on file shows last 4 digits for NMI clients', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/leads');
    await page.waitForLoadState('networkidle');

    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    if (count === 0) {
      test.skip();
      return;
    }

    let found = false;
    for (let i = 0; i < Math.min(count, 10); i++) {
      await page.goto('/admin/leads');
      await page.waitForLoadState('networkidle');
      // Row click opens the LeadDetailSheet — follow "View Full Profile" to
      // reach the full lead detail page where the NMI section lives.
      await page.locator('table tbody tr').nth(i).click();
      const viewFullProfileLink = page.getByRole('link', { name: /view full profile/i });
      if (!(await viewFullProfileLink.isVisible({ timeout: 5_000 }).catch(() => false))) continue;
      await viewFullProfileLink.click();
      await page.waitForLoadState('networkidle');

      const badge = page.getByTestId('payment-processor-badge');
      if (await badge.isVisible({ timeout: 5_000 })) {
        const text = await badge.innerText();
        if (text.trim() === 'NMI') {
          const cardOnFile = page.getByTestId('nmi-card-on-file');
          if (await cardOnFile.isVisible({ timeout: 5_000 })) {
            const cardText = await cardOnFile.innerText();
            // Should contain last 4 digits pattern
            expect(cardText).toMatch(/•{4}\s*\d{4}/);
            found = true;
            break;
          }
        }
      }
    }

    if (!found) {
      test.skip();
    }
  });

});
