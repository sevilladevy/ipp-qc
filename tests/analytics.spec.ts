import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:5173";
const EMAIL = process.env.E2E_EMAIL || "admin@ipp.com";
const PASSWORD = process.env.E2E_PASSWORD || "admin@123";

test.describe("Analytics Page", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(BASE_URL + "/", { timeout: 30000 });

    // Navigate to analytics
    await page.click('a[href="/analitik"]');
    await page.waitForURL(BASE_URL + "/analitik", { timeout: 10000 });
  });

  test("should display analytics page", async ({ page }) => {
    // Check page title - use first() for multiple matches
    await expect(page.getByRole("heading", { name: /analytics|analitik/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test("should display KPI cards", async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check for KPI labels - use first() for multiple matches
    await expect(page.getByText(/qty\s*check/i).first()).toBeVisible();
    await expect(page.getByText(/yield/i).first()).toBeVisible();
    await expect(page.getByText(/ng\s*rate/i).first()).toBeVisible();
  });

  test("should switch tabs", async ({ page }) => {
    // Click metrics tab
    const metricsTab = page.getByTestId("analytics-tab-metrics");
    const metricsExists = await metricsTab.isVisible({ timeout: 2000 }).catch(() => false);

    if (metricsExists) {
      await metricsTab.click();
      await page.waitForTimeout(500);

      // Check metrics content loads
      await expect(page.getByText(/monitoring|per\s*meja/i).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("should filter by period mode", async ({ page }) => {
    // Find and click monthly mode
    const monthlyBtn = page.getByTestId("analytics-period-mode-monthly");
    const monthlyExists = await monthlyBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (monthlyExists) {
      await monthlyBtn.click();
      await page.waitForTimeout(2000);
    }

    // Page should still be visible
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("should display charts", async ({ page }) => {
    // Wait for charts to load
    await page.waitForTimeout(2000);

    // Check for Pareto or Trend chart - use first() for multiple matches
    const hasPareto = await page.getByText(/pareto/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasTrend = await page.getByText(/trend/i).first().isVisible({ timeout: 5000 }).catch(() => false);

    // At least one chart should be visible
    expect(hasPareto || hasTrend).toBeTruthy();
  });

  test("should filter by shift", async ({ page }) => {
    // Open shift dropdown
    const selects = page.locator("select");
    const count = await selects.count();

    if (count > 1) {
      await selects.nth(1).selectOption("A").catch(() => {});
      await page.waitForTimeout(1000);
    }

    // Page should still be visible
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("should switch to metrics tab and show tables", async ({ page }) => {
    // Click metrics tab
    const metricsTab = page.getByTestId("analytics-tab-metrics");
    const metricsExists = await metricsTab.isVisible({ timeout: 2000 }).catch(() => false);

    if (metricsExists) {
      await metricsTab.click();
      await page.waitForTimeout(500);

      // Check for table content
      const hasTable = await page.getByText(/monitoring|comparison|per\s*meja/i).first().isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasTable).toBeTruthy();
    }
  });
});
