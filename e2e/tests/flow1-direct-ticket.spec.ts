import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";

// FIXED: Use a static title that won't change between retries
const TICKET_TITLE = `QA Ticket ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;

test.describe.serial("Flow 1 — Direct Ticket Lifecycle", () => {

  test("client can create a support ticket", async ({ page }) => {
    await loginAs(page, "client");
    await expect(page).toHaveURL(/client-dashboard/);

    await page.goto("/client-dashboard/support");
    await page.waitForLoadState("networkidle");

    await page.getByRole("tab", { name: "Support Tickets" }).click();
    await page.waitForTimeout(500);

    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await page.waitForTimeout(1000);

    await page.getByRole("textbox", { name: "Subject *" }).fill(TICKET_TITLE);
    await page.getByRole("textbox", { name: "Description *" }).fill(
      "Automated QA test ticket. Please ignore."
    );

    await page.getByRole("button", { name: "Submit Ticket" }).last().click();
    await page.waitForTimeout(3000);

    // Close any success modal
    try {
      await page.getByRole("button", { name: "Close" }).click({ timeout: 3000 });
      await page.waitForTimeout(500);
    } catch { /* no modal */ }

    // Go back to support page to see the ticket list
    await page.goto("/client-dashboard/support");
    await page.waitForLoadState("networkidle");
    await page.getByRole("tab", { name: "Support Tickets" }).click();
    await page.waitForTimeout(1000);

    await expect(page.getByText(TICKET_TITLE).first())
      .toBeVisible({ timeout: 15000 });
  });

  test("admin can see the ticket in admin panel", async ({ page }) => {
    await loginAs(page, "admin");

    await page.goto("/admin/tickets");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    await page.getByPlaceholder("Search by ticket #, title, or submitter...")
      .fill(TICKET_TITLE);
    await page.waitForTimeout(2000);

    await expect(page.getByText(TICKET_TITLE).first())
      .toBeVisible({ timeout: 15000 });
  });

  test("admin can open ticket detail", async ({ page }) => {
    await loginAs(page, "admin");

    await page.goto("/admin/tickets");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    await page.getByPlaceholder("Search by ticket #, title, or submitter...")
      .fill(TICKET_TITLE);
    await page.waitForTimeout(2000);

    await page.getByText(TICKET_TITLE).first().click();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/tickets/);
    await expect(page.getByText(TICKET_TITLE).first())
      .toBeVisible({ timeout: 10000 });
  });

  test("client sees their ticket in support page", async ({ page }) => {
    await loginAs(page, "client");

    await page.goto("/client-dashboard/support");
    await page.waitForLoadState("networkidle");

    await page.getByRole("tab", { name: "Support Tickets" }).click();
    await page.waitForTimeout(1000);

    await expect(page.getByText(TICKET_TITLE).first())
      .toBeVisible({ timeout: 15000 });
  });

  test("direct client cannot access admin ticket panel", async ({ page }) => {
    await loginAs(page, "client");

    await page.goto("/admin/tickets");
    await page.waitForLoadState("networkidle");

    await expect(page).not.toHaveURL("/admin/tickets");
  });

});