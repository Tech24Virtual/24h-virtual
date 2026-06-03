import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

// Known WL portal slug for qa-test-agency
const WL_PORTAL_SLUG = 'qa-test-agency';

test.describe('Branding Leakage — WL Partner Dashboard', () => {

  test('BL-01: Desktop header shows no 24H Virtual logo or name', async ({ page }) => {
    await loginAs(page, 'wlOwner');
    await page.goto('/white-label-dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Dismiss tour modal
    try {
      await page.getByRole('button', { name: 'Skip Tour' }).click({ timeout: 3000, force: true });
      await page.waitForTimeout(500);
    } catch { /* no modal */ }

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);

    // After fix: no 24H Virtual logo should appear on desktop
    const leakyImages = page.locator('img[alt="24H Virtual"]');
    await expect(leakyImages).toHaveCount(0);
  });

  test('BL-02: Mobile header shows no 24H Virtual logo', async ({ page }) => {
    await loginAs(page, 'wlOwner');
    await page.goto('/white-label-dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Dismiss tour modal
    try {
      await page.getByRole('button', { name: 'Skip Tour' }).click({ timeout: 3000, force: true });
      await page.waitForTimeout(500);
    } catch { /* no modal */ }

    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);

    // After fix: no 24H Virtual logo should appear on mobile either
    const leakyImages = page.locator('img[alt="24H Virtual"]');
    await expect(leakyImages).toHaveCount(0);
  });

  test('BL-03: WL partner support page shows no 24H branding', async ({ page }) => {
    await loginAs(page, 'wlOwner');
    await page.goto('/white-label-dashboard/support');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page.getByRole('heading', { name: 'Support' })).toBeVisible();

    const bodyText = await page.locator('main, [role="main"], .flex-1').first().innerText();
    expect(bodyText).not.toMatch(/24H Virtual/i);
  });

  test('BL-04: WL partner client-tickets page shows no 24H branding', async ({ page }) => {
    await loginAs(page, 'wlOwner');
    await page.goto('/white-label-dashboard/client-tickets');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page.getByRole('heading', { name: 'Client Tickets' })).toBeVisible();

    const bodyText = await page.locator('main, [role="main"], .flex-1').first().innerText();
    expect(bodyText).not.toMatch(/24H Virtual/i);
  });

  test('BL-09: document.title does not contain "24H Virtual" on WL partner dashboard', async ({ page }) => {
    await loginAs(page, 'wlOwner');
    await page.goto('/white-label-dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const title = await page.title();
    expect(title).not.toContain('24H Virtual');
  });

  test('BL-10: document.title does not contain "24H Virtual" on WL client tickets page', async ({ page }) => {
    await loginAs(page, 'wlOwner');
    await page.goto('/white-label-dashboard/client-tickets');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const title = await page.title();
    expect(title).not.toContain('24H Virtual');
  });

  test('BL-11: GA4 and Meta pixel scripts are NOT injected on WL partner dashboard', async ({ page }) => {
    await loginAs(page, 'wlOwner');
    await page.goto('/white-label-dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const ga4Loaded = await page.evaluate(() => !!document.getElementById('ga4-script'));
    const metaLoaded = await page.evaluate(() => !!document.getElementById('meta-pixel-script'));

    expect(ga4Loaded).toBe(false);
    expect(metaLoaded).toBe(false);
  });

  test('BL-12: og:title meta tag does not contain "24H Virtual" on WL partner dashboard', async ({ page }) => {
    await loginAs(page, 'wlOwner');
    await page.goto('/white-label-dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const ogTitle = await page.evaluate(() =>
      document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '');

    expect(ogTitle).not.toContain('24H Virtual');
  });

  test('BL-05: WL partner cannot access admin routes', async ({ page }) => {
    await loginAs(page, 'wlOwner');

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/^.*\/admin$/);

    await page.goto('/admin/tickets');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL('/admin/tickets');
  });

});

test.describe('Branding Leakage — WL End-Client Portal', () => {

  test('BL-06: WL portal login page shows partner branding not 24H', async ({ page }) => {
    await page.goto(`/portal/${WL_PORTAL_SLUG}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const url = page.url();
    if (url.includes('/portal/')) {
      const bodyText = await page.locator('body').innerText();
      expect(bodyText).not.toMatch(/24H Virtual/i);
    } else {
      await expect(page.locator('body')).not.toContainText('24H Virtual');
    }
  });

  test('BL-07: Direct client dashboard shows no WL partner data', async ({ page }) => {
    await loginAs(page, 'client');

    await page.goto('/client-dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    try {
      await page.getByRole('button', { name: 'Skip Tour' }).click({ timeout: 3000, force: true });
    } catch { /* no modal */ }

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/QA Test Agency/i);
    expect(bodyText).not.toMatch(/qa-test-agency/i);
  });

  test('BL-08: WL partner Flow 2 test confirms no 24H branding visible', async ({ page }) => {
    await loginAs(page, 'wlOwner');

    await page.goto('/white-label-dashboard/support');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.getByRole('tab', { name: 'Support Tickets' }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText('24H Virtual')).not.toBeVisible();
  });

});