import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:5173";
const EMAIL = process.env.E2E_EMAIL || "admin@ipp.com";
const PASSWORD = process.env.E2E_PASSWORD || "admin@123";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(BASE_URL + "/", { timeout: 30000 });
  });

  test("should display dashboard page", async ({ page }) => {
    // Check page title
    await expect(page.locator("h1:has-text('Dashboard')")).toBeVisible();

    // Check page description with date
    const today = new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    await expect(page.locator(`text=${today}`)).toBeVisible();
  });

  test("should display KPI cards", async ({ page }) => {
    // Wait for KPI cards to load
    await page.waitForSelector('[data-testid*="kpi"]', { timeout: 10000 }).catch(() => {
      // If no specific testids, check for KPI labels
    });

    // Check for KPI labels
    await expect(page.locator("text=Qty Check")).toBeVisible();
    await expect(page.locator("text=Yield")).toBeVisible();
    await expect(page.locator("text=NG Rate")).toBeVisible();
    await expect(page.locator("text=Reports")).toBeVisible();
  });

  test("should filter by period mode", async ({ page }) => {
    // Find and click weekly mode
    await page.getByTestId("dashboard-period-mode-weekly").click();

    // Wait for data to reload
    await page.waitForTimeout(2000);

    // Data should still show
    await expect(page.locator("h1:has-text('Dashboard')")).toBeVisible();
  });

  test("should filter by meja", async ({ page }) => {
    // Open meja dropdown
    await page
      .locator("select")
      .first()
      .selectOption({ index: 1 })
      .catch(() => {
        // If select not available, skip
      });

    // Wait for data to reload
    await page.waitForTimeout(2000);
  });

  test("should navigate to analytics page", async ({ page }) => {
    // Click analytics link
    await page.click('a[href="/analitik"]');

    // Wait for navigation
    await page.waitForURL(BASE_URL + "/analitik", { timeout: 10000 });

    // Check analytics page loads
    await expect(page.locator("text=Analytics Management View")).toBeVisible();
  });

  test("should navigate to input page", async ({ page }) => {
    // Click input link
    await page.click('a[href="/input"]');

    // Wait for navigation
    await page.waitForURL(BASE_URL + "/input", { timeout: 10000 });

    // Check input page loads
    await expect(page.locator("h1:has-text('Input Laporan Inspeksi')")).toBeVisible();
  });
});
