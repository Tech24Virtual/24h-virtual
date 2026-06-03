import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe.serial('Flow 2 — WL Ticket Lifecycle', () => {

  let WL_TICKET_TITLE: string;

  test.beforeAll(() => {
    WL_TICKET_TITLE = `WL QA Ticket ${Date.now()}`;
  });

  // ─────────────────────────────────────────
  // TEST 1: WL partner can create a ticket
  // ─────────────────────────────────────────
  test('WL partner can create a support ticket', async ({ page }) => {
  await loginAs(page, 'wlOwner');
  await expect(page).toHaveURL(/white-label-dashboard/, { timeout: 15000 });

  await page.goto('/white-label-dashboard/support');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // extra wait

  await page.getByRole('tab', { name: 'Support Tickets' }).click();
  await page.waitForTimeout(1000); // extra wait

  await page.getByRole('button', { name: 'Submit Ticket' }).click();
  await page.waitForTimeout(1500); // extra wait

  await page.getByRole('textbox', { name: 'Subject *' }).fill(WL_TICKET_TITLE);
  await page.getByRole('textbox', { name: 'Description *' }).fill(
    'Automated WL QA test ticket. Please ignore.'
  );

  await page.getByRole('button', { name: 'Submit Ticket' }).last().click();
  await page.waitForTimeout(4000); // longer wait for submission

  try {
    await page.getByRole('button', { name: 'Close' }).click({ timeout: 3000 });
    await page.waitForTimeout(500);
  } catch (_) { /* no modal */ }

  await page.goto('/white-label-dashboard/support');
  await page.waitForLoadState('networkidle');
  await page.getByRole('tab', { name: 'Support Tickets' }).click();
  await page.waitForTimeout(2000);

  await expect(page.getByText(WL_TICKET_TITLE).first())
    .toBeVisible({ timeout: 20000 });
});

  // ─────────────────────────────────────────
  // TEST 2: Admin can see WL ticket
  // ─────────────────────────────────────────
  test('admin sees WL ticket with Partner badge (correct behavior)', async ({ page }) => {
  await loginAs(page, 'admin');

  await page.goto('/admin/tickets');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Search for the ticket
  await page.getByPlaceholder('Search by ticket #, title, or submitter...')
    .fill(WL_TICKET_TITLE);
  await page.waitForTimeout(2000);

  // Admin CAN see WL tickets in the UI (intentional for support)
  // but they show with a "Partner" badge to identify them
  await expect(page.getByText(WL_TICKET_TITLE).first())
    .toBeVisible({ timeout: 10000 });

  // Verify it shows the Partner badge (not a direct client ticket)
  await expect(page.getByText('Partner').first())
    .toBeVisible({ timeout: 5000 });

  // Key security point: RLS blocks direct DB queries (proven in t2-rls-proof.spec.ts)
  // The UI uses a special admin view that's intentionally allowed
});

  // ─────────────────────────────────────────
  // TEST 3: WL partner can see their own tickets
  // ─────────────────────────────────────────
  test('WL partner sees their own tickets', async ({ page }) => {
  await loginAs(page, 'wlOwner');

  await page.goto('/white-label-dashboard/support');
  await page.waitForLoadState('networkidle');

  await page.getByRole('tab', { name: 'Support Tickets' }).click();
  await page.waitForTimeout(1000);

  // Partner sees their own ticket
  await expect(page.getByText(WL_TICKET_TITLE).first())
    .toBeVisible({ timeout: 15000 });

  // Partner does NOT see 24H Virtual branding anywhere
  await expect(page.getByText('24H Virtual')).not.toBeVisible();
});

  // ─────────────────────────────────────────
  // TEST 4: Direct client cannot see WL tickets
  // ─────────────────────────────────────────
  test('direct client cannot see WL partner tickets', async ({ page }) => {
    await loginAs(page, 'client');

    await page.goto('/client-dashboard/support');
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: 'Support Tickets' }).click();
    await page.waitForTimeout(1000);

    // Direct client should never see WL partner tickets
    const ticketVisible = await page.getByText(WL_TICKET_TITLE).isVisible().catch(() => false);
    expect(ticketVisible).toBe(false);
  });

  // ─────────────────────────────────────────
  // TEST 5: WL partner cannot access admin panel
  // ─────────────────────────────────────────
  test('WL partner cannot access admin panel', async ({ page }) => {
    await loginAs(page, 'wlOwner');

    await page.goto('/admin/tickets');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL('/admin/tickets');
  });

});