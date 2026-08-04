import { Page } from '@playwright/test';

export const TEST_USERS = {
  admin:      'qa-admin@24hv-test.com',
  agent:      'qa-agent@24hv-test.com',
  supervisor: 'qa-supervisor@24hv-test.com',
  client:     'qa-client@24hv-test.com',
  wlOwner:    'qa-wl-owner@24hv-test.com',
  wlClient1:  'qa-wl-client1@24hv-test.com',
  wlPartnerB: 'qa-wl-partner-b@24hv-test.com',
};

const PASSWORD = 'QATestPass123!';

// wl_client-role users are blocked from the main /login page and must
// authenticate through their partner's dedicated portal login route.
const WL_PORTAL_LOGIN_ROLES: Partial<Record<keyof typeof TEST_USERS, string>> = {
  wlClient1: '/portal/acme-corp/login',
};

export async function loginAs(page: Page, role: keyof typeof TEST_USERS) {
  const loginUrl = WL_PORTAL_LOGIN_ROLES[role] ?? '/login';
  await page.goto(loginUrl);
  await page.waitForLoadState('networkidle');

  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(TEST_USERS[role]);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait until redirected away from login
  await page.waitForURL(
    url => !url.toString().includes('/login'),
    { timeout: 15000 }
  );

  await page.waitForTimeout(1500);

  // Wait for dashboard to fully load (roles resolved)
  try {
    const dashboardSelectors: Record<string, string> = {
      admin:      'text=Admin Dashboard',
      agent:      'text=Agent Dashboard',
      supervisor: 'text=Supervisor Dashboard',
      client:     'text=Client Dashboard',
      wlOwner:    'text=Partner Dashboard',
      wlClient1:  '[data-testid="wl-portal"]',
      wlPartnerB: 'text=Partner Dashboard',
    };
    const selector = dashboardSelectors[role];
    if (selector) {
      await page.waitForSelector(selector, { timeout: 8000 });
    }
  } catch (_) { /* dashboard heading may differ, fall through */ }

  // Handle "PiP: Getting Started" / "Skip Tour" modal
  try {
    await page.getByRole('button', { name: 'Skip Tour' }).click({ timeout: 3000, force: true });
    await page.waitForTimeout(500);
  } catch (_) { /* not present */ }

  // Handle "Maybe later" marketing popup
  try {
    await page.getByRole('button', { name: 'Maybe later' }).click({ timeout: 3000, force: true });
    await page.waitForTimeout(500);
  } catch (_) { /* not present */ }

  // Handle "Welcome Aboard" / "Got it, let's go" modal (WL partner)
  try {
    await page.getByRole('button', { name: "Got it, let's go" }).click({ timeout: 3000, force: true });
    await page.waitForTimeout(500);
  } catch (_) { /* not present */ }
}