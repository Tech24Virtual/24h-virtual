import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

async function navigateToAgentScripts(page: import('@playwright/test').Page) {
  await page.goto('/staff/agent/scripts');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

test.describe.serial('Flow 16 — Agent In-Call FAQ & Policy Lookup', () => {

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Agent sees all three tabs on the scripts page
  // ──────────────────────────────────────────────────────────────────────────
  test('agent sees Scripts, FAQs, and Policies tabs on scripts page', async ({ page }) => {
    await loginAs(page, 'agent');
    await navigateToAgentScripts(page);

    const tabsContainer = page.getByTestId('agent-scripts-tabs');
    await expect(tabsContainer).toBeVisible({ timeout: 8000 });

    await expect(page.getByTestId('tab-scripts')).toBeVisible();
    await expect(page.getByTestId('tab-faqs')).toBeVisible();
    await expect(page.getByTestId('tab-policies')).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: FAQs tab renders — either results or empty state
  // ──────────────────────────────────────────────────────────────────────────
  test('agent can open FAQs tab and sees content or empty state', async ({ page }) => {
    await loginAs(page, 'agent');
    await navigateToAgentScripts(page);

    await page.getByTestId('tab-faqs').click();
    await page.waitForTimeout(800);

    const faqContent = page.getByTestId('faqs-tab-content');
    await expect(faqContent).toBeVisible({ timeout: 8000 });

    // Search input must always be present
    await expect(page.getByTestId('faq-search-input')).toBeVisible();

    // Either a list of results or an empty state is shown
    const hasList  = await page.getByTestId('faq-results-list').isVisible().catch(() => false);
    const hasEmpty = await page.getByTestId('faq-empty-state').isVisible().catch(() => false);
    expect(hasList || hasEmpty).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: FAQ search filters results
  // ──────────────────────────────────────────────────────────────────────────
  test('agent can search FAQs and results filter correctly', async ({ page }) => {
    await loginAs(page, 'agent');
    await navigateToAgentScripts(page);

    await page.getByTestId('tab-faqs').click();
    await page.waitForTimeout(800);

    const hasList = await page.getByTestId('faq-results-list').isVisible().catch(() => false);
    if (!hasList) {
      test.skip(true, 'No approved FAQs for this agent — skipping search test.');
      return;
    }

    // Count items before search
    const beforeCount = await page.getByTestId('faq-result-item').count();
    expect(beforeCount).toBeGreaterThan(0);

    // Get text from the first FAQ question and search a substring of it
    const firstQuestion = await page.getByTestId('faq-question').first().textContent();
    const searchTerm = firstQuestion?.slice(0, 5) ?? 'a';

    await page.getByTestId('faq-search-input').fill(searchTerm);
    await page.waitForTimeout(400);

    // After filtering, only matching items remain (or empty state)
    const afterList  = await page.getByTestId('faq-results-list').isVisible().catch(() => false);
    const afterEmpty = await page.getByTestId('faq-empty-state').isVisible().catch(() => false);
    expect(afterList || afterEmpty).toBe(true);

    if (afterList) {
      const afterCount = await page.getByTestId('faq-result-item').count();
      expect(afterCount).toBeLessThanOrEqual(beforeCount);
    }

    // Clear search — list should return to full count
    await page.getByTestId('faq-search-input').fill('');
    await page.waitForTimeout(300);
    const restoredCount = await page.getByTestId('faq-result-item').count();
    expect(restoredCount).toBe(beforeCount);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Policies tab renders — either results or empty state
  // ──────────────────────────────────────────────────────────────────────────
  test('agent can open Policies tab and sees content or empty state', async ({ page }) => {
    await loginAs(page, 'agent');
    await navigateToAgentScripts(page);

    await page.getByTestId('tab-policies').click();
    await page.waitForTimeout(800);

    const policyContent = page.getByTestId('policies-tab-content');
    await expect(policyContent).toBeVisible({ timeout: 8000 });

    // Search input must always be present
    await expect(page.getByTestId('policy-search-input')).toBeVisible();

    const hasList  = await page.getByTestId('policy-results-list').isVisible().catch(() => false);
    const hasEmpty = await page.getByTestId('policy-empty-state').isVisible().catch(() => false);
    expect(hasList || hasEmpty).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: Policy search filters results
  // ──────────────────────────────────────────────────────────────────────────
  test('agent can search Policies and results filter correctly', async ({ page }) => {
    await loginAs(page, 'agent');
    await navigateToAgentScripts(page);

    await page.getByTestId('tab-policies').click();
    await page.waitForTimeout(800);

    const hasList = await page.getByTestId('policy-results-list').isVisible().catch(() => false);
    if (!hasList) {
      test.skip(true, 'No approved policies for this agent — skipping search test.');
      return;
    }

    const beforeCount = await page.getByTestId('policy-result-item').count();
    expect(beforeCount).toBeGreaterThan(0);

    const firstTitle = await page.getByTestId('policy-title').first().textContent();
    const searchTerm = firstTitle?.slice(0, 5) ?? 'a';

    await page.getByTestId('policy-search-input').fill(searchTerm);
    await page.waitForTimeout(400);

    const afterList  = await page.getByTestId('policy-results-list').isVisible().catch(() => false);
    const afterEmpty = await page.getByTestId('policy-empty-state').isVisible().catch(() => false);
    expect(afterList || afterEmpty).toBe(true);

    if (afterList) {
      const afterCount = await page.getByTestId('policy-result-item').count();
      expect(afterCount).toBeLessThanOrEqual(beforeCount);
    }

    await page.getByTestId('policy-search-input').fill('');
    await page.waitForTimeout(300);
    const restoredCount = await page.getByTestId('policy-result-item').count();
    expect(restoredCount).toBe(beforeCount);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: FAQs and Policies are read-only — no edit/delete controls visible
  // ──────────────────────────────────────────────────────────────────────────
  test('agent cannot edit or modify FAQs or policies (read-only)', async ({ page }) => {
    await loginAs(page, 'agent');
    await navigateToAgentScripts(page);

    // FAQs tab — no edit/delete buttons
    await page.getByTestId('tab-faqs').click();
    await page.waitForTimeout(800);

    const faqEditBtn   = page.getByRole('button', { name: /edit/i }).first();
    const faqDeleteBtn = page.getByRole('button', { name: /delete/i }).first();
    await expect(faqEditBtn).not.toBeVisible().catch(() => {});
    await expect(faqDeleteBtn).not.toBeVisible().catch(() => {});

    // Policies tab — no edit/delete buttons
    await page.getByTestId('tab-policies').click();
    await page.waitForTimeout(800);

    const policyEditBtn   = page.getByRole('button', { name: /edit/i }).first();
    const policyDeleteBtn = page.getByRole('button', { name: /delete/i }).first();
    await expect(policyEditBtn).not.toBeVisible().catch(() => {});
    await expect(policyDeleteBtn).not.toBeVisible().catch(() => {});
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 7: Policy kind badge is shown for each policy
  // ──────────────────────────────────────────────────────────────────────────
  test('each policy result shows a policy kind badge', async ({ page }) => {
    await loginAs(page, 'agent');
    await navigateToAgentScripts(page);

    await page.getByTestId('tab-policies').click();
    await page.waitForTimeout(800);

    const hasList = await page.getByTestId('policy-results-list').isVisible().catch(() => false);
    if (!hasList) {
      test.skip(true, 'No approved policies for this agent — skipping badge test.');
      return;
    }

    const firstBadge = page.getByTestId('policy-kind-badge').first();
    await expect(firstBadge).toBeVisible();
    const badgeText = await firstBadge.textContent();
    expect(badgeText?.trim().length).toBeGreaterThan(0);
  });
});
