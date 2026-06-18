/**
 * Flow 29 — NMI Webhook
 *
 * Tests:
 *   1. Webhook returns 403 without secret
 *   2. Webhook returns 403 with wrong secret
 *   3. Webhook returns 200 with correct secret (approval payload)
 *   4. Webhook returns 200 with correct secret (decline payload)
 *   5. Admin can view the billing page (which embeds the PaymentFailures component)
 *   6. Payment failures section renders without error
 *
 * Notes:
 *   - Tests 1–4 hit the edge function URL directly via Playwright's request API.
 *   - The webhook secret used here matches what is set in Supabase secrets:
 *     NMI_WEBHOOK_SECRET="whsec_24hVirtual2024!"
 *   - order_id in tests 3–4 is a non-existent UUID; the function returns 200
 *     with warning "lead_not_found" — that is the correct idempotent behaviour.
 */

import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

const WEBHOOK_URL =
  'https://sdsxdqsomxuimrjpaylv.supabase.co/functions/v1/nmi-webhook';
const CORRECT_SECRET  = 'whsec_24hVirtual2024!';
const WRONG_SECRET    = 'invalid_secret_xyz';

// Placeholder UUID — no lead with this ID exists; tests the graceful path
const FAKE_LEAD_ID = '00000000-0000-0000-0000-000000000001';

// ─────────────────────────────────────────────────────────────────────────────
// Webhook endpoint tests (no browser needed — uses request fixture)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('NMI Webhook — endpoint security', () => {
  test('returns 403 without secret', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      data: 'response=1&transactionid=TEST-NO-SECRET&order_id=' + FAKE_LEAD_ID,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  test('returns 403 with wrong secret', async ({ request }) => {
    const res = await request.post(
      `${WEBHOOK_URL}?secret=${WRONG_SECRET}`,
      {
        data: 'response=1&transactionid=TEST-WRONG-SECRET&order_id=' + FAKE_LEAD_ID,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  test('returns 200 with correct secret — approval payload', async ({ request }) => {
    const res = await request.post(
      `${WEBHOOK_URL}?secret=${encodeURIComponent(CORRECT_SECRET)}`,
      {
        data: [
          'response=1',
          'responsetext=Approved',
          'response_code=100',
          'transactionid=WEBHOOK-TEST-APPROVE-001',
          `order_id=${FAKE_LEAD_ID}`,
          'amount=99.00',
          'condition=pendingsettlement',
        ].join('&'),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    // Lead not found is the expected graceful path for a fake UUID
    expect(['lead_not_found', undefined]).toContain(body.warning);
  });

  test('returns 200 with correct secret — decline payload', async ({ request }) => {
    const res = await request.post(
      `${WEBHOOK_URL}?secret=${encodeURIComponent(CORRECT_SECRET)}`,
      {
        data: [
          'response=2',
          'responsetext=DECLINE',
          'response_code=200',
          'transactionid=WEBHOOK-TEST-DECLINE-001',
          `order_id=${FAKE_LEAD_ID}`,
          'amount=49.00',
          'condition=failed',
        ].join('&'),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
  });

  test('returns 200 for GET health-check with correct secret', async ({ request }) => {
    const res = await request.get(
      `${WEBHOOK_URL}?secret=${encodeURIComponent(CORRECT_SECRET)}`,
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin UI tests
// ─────────────────────────────────────────────────────────────────────────────

test.describe('NMI Webhook — admin UI', () => {
  test('admin billing page loads and payment failures section renders', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/billing');
    await page.waitForLoadState('networkidle');

    // Page must load without a full-page error
    await expect(page.locator('body')).not.toContainText(
      'Application error',
      { timeout: 8000 },
    );

    // PaymentFailures component renders with CardTitle "Payment Issues"
    // regardless of whether there are open failures or not.
    await expect(page.locator('text=Payment Issues').first()).toBeVisible({ timeout: 10000 });
  });

  test('admin can navigate to a lead that has NMI payment data', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/leads');
    await page.waitForLoadState('networkidle');

    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    if (count === 0) {
      test.skip();
      return;
    }

    // Click the first lead and navigate to the Billing tab
    await rows.first().click();
    await page.waitForLoadState('networkidle');

    // Look for the Billing tab in lead detail
    const billingTab = page.getByRole('tab', { name: /billing/i });
    const tabExists = await billingTab.count();
    if (tabExists === 0) {
      test.skip();
      return;
    }

    await billingTab.click();
    await page.waitForTimeout(500);

    // The NMI payment section should render without crashing
    await expect(page.locator('body')).not.toContainText('Application error');
  });
});
