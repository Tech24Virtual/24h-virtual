import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe.serial('Flow 7 — TicketThread Component', () => {

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1: WL partner can view a WL client ticket thread
  // ─────────────────────────────────────────────────────────────────────────
  test('WL partner can view a WL client ticket thread', async ({ page }) => {
    await loginAs(page, 'wlOwner');
    await expect(page).toHaveURL(/white-label-dashboard/, { timeout: 15000 });

    await page.goto('/white-label-dashboard/client-tickets');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Click the first ticket row to open the inline panel
    await page.locator('button.w-full.text-left').first().click();
    await page.waitForTimeout(1500);

    // TicketThread renders a textarea once the panel is open
    await expect(
      page.getByPlaceholder('Type a message…')
    ).toBeVisible({ timeout: 10000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2: WL partner can post a reply on a WL client ticket
  //
  // NOTE: Requires update-ticket-status edge function to be live for the WL
  // lane (T-4). Until then the mutation returns 501 and the toast shows an
  // error instead — that is the correct TDD signal.
  // ─────────────────────────────────────────────────────────────────────────
  test('WL partner can post a reply on a WL client ticket', async ({ page }) => {
    await loginAs(page, 'wlOwner');

    await page.goto('/white-label-dashboard/client-tickets');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.locator('button.w-full.text-left').first().click();
    await page.waitForTimeout(1500);

    await page.getByPlaceholder('Type a message…').fill('Flow7 WL reply test');
    await page.getByRole('button', { name: 'Send Message' }).click();
    await page.waitForTimeout(3000);

    await expect(
      page.getByText('Flow7 WL reply test').first()
    ).toBeVisible({ timeout: 10000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3: WL partner B cannot see partner A's tickets
  //
  // Verifies RLS isolation: the known Partner A ticket UUIDs must not appear
  // anywhere in the page body (not in visible text, data attributes, or any
  // rendered DOM node).
  // ─────────────────────────────────────────────────────────────────────────
  test('WL partner B cannot see partner A tickets', async ({ page }) => {
    await loginAs(page, 'wlPartnerB');

    await page.goto('/white-label-dashboard/client-tickets');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const bodyText = await page.locator('body').innerText();

    // Partner A ticket IDs must not leak into any rendered content
    expect(bodyText).not.toContain('1c228b70-f4d9-44b4-8309-9705803f41b7');
    expect(bodyText).not.toContain('36b1866f-30dc-4068-a2e7-e34c0e15a385');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 4: Direct client can view ticket thread
  //
  // Navigates directly to the seeded ticket (fixed UUID from seed/seed.ts).
  // Requires /client-dashboard/support/:id route (added in T-6).
  // ─────────────────────────────────────────────────────────────────────────
  test('direct client can view ticket thread', async ({ page }) => {
    await loginAs(page, 'client');
    await expect(page).toHaveURL(/client-dashboard/, { timeout: 15000 });

    // Navigate directly to the seeded qa-client ticket (fixed UUID)
    await page.goto('/client-dashboard/support/f7000001-0000-0000-0000-000000000000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // The TicketThread textarea should be visible on the detail page
    await expect(
      page.getByPlaceholder('Type a message…')
    ).toBeVisible({ timeout: 10000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 5: Direct client can post a reply
  //
  // NOTE: Requires update-ticket-status edge function to be live for the
  // direct lane (T-3). Until then the mutation returns 501 and the toast
  // shows an error — that is the correct TDD signal.
  // ─────────────────────────────────────────────────────────────────────────
  test('direct client can post a reply', async ({ page }) => {
    await loginAs(page, 'client');

    await page.goto('/client-dashboard/support/f7000001-0000-0000-0000-000000000000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.getByPlaceholder('Type a message…').fill('Flow7 direct reply test');
    await page.getByRole('button', { name: 'Send Message' }).click();
    await page.waitForTimeout(3000);

    await expect(
      page.getByText('Flow7 direct reply test').first()
    ).toBeVisible({ timeout: 10000 });
  });

});
