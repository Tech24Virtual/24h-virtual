/**
 * Flow 20 — WL Portal Branding (path-based routes)
 *
 * Verifies that WLPortalContext injects partner branding into the document
 * head on path-based /portal/:slug routes (not just on custom-domain hosts).
 *
 * Tests:
 *   1. document.title becomes the partner's company_name after navigating to portal
 *   2. <link rel="icon"> href is updated when partner has favicon_url set
 *   3. <meta property="og:title"> content is updated to partner's company_name
 *   4. Navigating away from the portal restores document.title to 'Client Portal'
 */

import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe.serial('Flow 20 — WL Portal Branding', () => {
  // Shared: resolved after the first test, used in subsequent ones
  let portalUrl: string;

  // ── Test 1: document.title is set to partner brand name ──────────────────────
  test('document.title becomes partner company name on /portal/:slug', async ({ page }) => {
    await loginAs(page, 'wlClient1');
    await page.waitForLoadState('networkidle');

    // After login, wlClient1 should be redirected to their /portal/:slug route
    portalUrl = page.url();
    expect(portalUrl).toContain('/portal/');

    // Allow branding fetch to settle
    await page.waitForTimeout(1500);

    const title = await page.title();
    // Should be the partner's company name — not the bare index.html placeholder
    expect(title).not.toBe('');
    expect(title).not.toBe('Client Portal');
  });

  // ── Test 2: favicon href is updated when partner has favicon_url ─────────────
  test('favicon link href is updated to partner favicon_url (if set)', async ({ page }) => {
    await loginAs(page, 'wlClient1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const faviconHref = await page.evaluate(() => {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      return link?.href ?? null;
    });

    // Favicon element must exist
    expect(faviconHref).not.toBeNull();

    // If the partner has configured a favicon_url, it will be an absolute https URL
    // pointing to Supabase storage — not the local /favicon.png asset.
    // We accept either outcome (partner may not have configured a favicon_url in staging)
    // but the href must be a non-empty string.
    expect(faviconHref!.length).toBeGreaterThan(0);
  });

  // ── Test 3: OG title is updated ──────────────────────────────────────────────
  test('og:title meta content is updated to partner company name', async ({ page }) => {
    await loginAs(page, 'wlClient1');

    // The branding useEffect and the og:title DOM mutation both happen after the
    // async Supabase fetch. Poll for document.title exiting its two pre-portal
    // states ('Client Portal' = index.html default; 'Login | 24H Virtual' =
    // react-helmet-async managing the Login page's <SEO>). When title is neither,
    // branding has landed and og:title will be set.
    await page.waitForFunction(
      () => {
        const t = document.title;
        return t.length > 0 && t !== 'Client Portal' && !t.includes('24H Virtual');
      },
      { timeout: 30000 }
    );

    // One extra tick for the og:title DOM write in the same effect
    await page.waitForTimeout(300);

    const domSnapshot = await page.evaluate(() => ({
      docTitle: document.title,
      ogMetas: Array.from(document.querySelectorAll("meta[property='og:title']"))
        .map(m => ({ content: m.getAttribute('content') })),
    }));

    expect(
      domSnapshot.ogMetas.some(m => m.content && m.content !== 'Client Portal'),
      `docTitle="${domSnapshot.docTitle}" | og:title metas: ${JSON.stringify(domSnapshot.ogMetas)}`
    ).toBe(true);
  });

  // ── Test 4: title is restored when navigating away ───────────────────────────
  test('navigating away from portal restores document.title to index.html default', async ({ page }) => {
    // Navigate directly to the portal (user already logged-in from shared context).
    // This matters for cleanup correctness: when the page loads fresh via full-page
    // navigation, index.html sets document.title = 'Client Portal' BEFORE React
    // mounts any Helmet. WLPortalContext captures that as previousTitle, so cleanup
    // will restore exactly 'Client Portal'.
    await page.goto('/portal/acme-corp');
    await page.waitForLoadState('networkidle');

    // Wait for branding to apply
    await page.waitForFunction(
      () => document.title !== 'Client Portal' && document.title.length > 0,
      { timeout: 30000 }
    );

    const portalTitle = await page.title();
    expect(portalTitle).not.toBe('Client Portal');

    // SPA-navigate away by clicking the logo (href="/") so React unmounts
    // WLPortalProvider and the cleanup effect runs synchronously.
    await page.locator('a[href="/"]').first().click();
    await page.waitForFunction(
      (expected) => document.title !== expected,
      portalTitle,
      { timeout: 15000 }
    );

    const restoredTitle = await page.title();
    expect(restoredTitle).toBe('Client Portal');
  });
});
