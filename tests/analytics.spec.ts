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
    // Check page title
    await expect(page.locator("text=Analytics Management View")).toBeVisible();
  });

  test("should display KPI cards", async ({ page }) => {
    // Check for KPI labels
    await expect(page.locator("text=Qty Check")).toBeVisible();
    await expect(page.locator("text=Yield")).toBeVisible();
    await expect(page.locator("text=NG Rate")).toBeVisible();
  });

  test("should switch tabs", async ({ page }) => {
    // Click metrics tab
    await page.getByTestId("analytics-tab-metrics").click();
    await page.waitForTimeout(500);

    // Check metrics content loads
    await expect(page.locator("text=Monitoring NG Rate & Pass Rate per Meja")).toBeVisible();

    // Click deep-dive tab
    await page.getByTestId("analytics-tab-deep-dive").click();
    await page.waitForTimeout(500);

    // Check deep-dive content loads
    await expect(page.locator("text=Defect Deep Dive")).toBeVisible();
  });

  test("should filter by period mode", async ({ page }) => {
    // Find and click monthly mode
    await page.getByTestId("analytics-period-mode-monthly").click();

    // Wait for data to reload
    await page.waitForTimeout(2000);

    // Data should still show
    await expect(page.locator("text=Analytics Management View")).toBeVisible();
  });

  test("should display charts", async ({ page }) => {
    // Wait for charts to load
    await page.waitForTimeout(2000);

    // Check for Pareto chart
    await expect(page.locator("text=Pareto Defect").first()).toBeVisible();

    // Check for Trend chart
    await expect(page.locator("text=Trend Pass Rate, NG & NG Rate")).toBeVisible();
  });

  test("should filter by shift", async ({ page }) => {
    // Open shift dropdown
    const shiftSelect = page.locator("select").nth(1);
    await shiftSelect.selectOption("A");

    // Wait for data to reload
    await page.waitForTimeout(2000);
  });

  test("should switch to metrics tab and show tables", async ({ page }) => {
    // Click metrics tab
    await page.getByTestId("analytics-tab-metrics").click();
    await page.waitForTimeout(500);

    // Check for table
    await expect(page.locator("text=Monitoring NG Rate & Pass Rate per Meja")).toBeVisible();
    await expect(page.locator("text=Comparison by Shift")).toBeVisible();
  });
});
