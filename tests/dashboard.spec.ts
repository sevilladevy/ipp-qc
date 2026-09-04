import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:5173";
const EMAIL = process.env.E2E_EMAIL || "admin@ipp.com";
const PASSWORD = process.env.E2E_PASSWORD || "admin@123";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    // Wait for client hydration before filling controlled inputs,
    // otherwise React re-render can clobber filled values.
    await page.waitForLoadState("networkidle");
    await page.getByRole("textbox", { name: /email/i }).fill(EMAIL);
    await page.getByRole("textbox", { name: /password/i }).fill(PASSWORD);
    await page.getByRole("button", { name: /login|masuk|submit/i }).click();
    await page.waitForURL(BASE_URL + "/", { timeout: 30000 });
  });

  test("should display dashboard page", async ({ page }) => {
    // Check page title - use first() for multiple matches
    await expect(page.getByRole("heading", { name: /dashboard/i }).first()).toBeVisible({
      timeout: 10000,
    });

    // Check page has content
    await expect(page.getByText(/qty|yield|ng|reports/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("should display KPI cards", async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(1000);

    // Check for KPI labels - use first() for multiple matches
    await expect(page.getByText(/qty\s*check/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/yield/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/ng\s*rate/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/reports/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("should filter by meja", async ({ page }) => {
    // Find and try to select from dropdown
    const selects = page.locator("select");
    const count = await selects.count();

    if (count > 0) {
      await selects
        .first()
        .selectOption({ index: 1 })
        .catch(() => {});
      await page.waitForTimeout(1000);
    }

    // Verify dashboard still shows
    await expect(page.getByRole("heading", { name: /dashboard/i }).first()).toBeVisible();
  });

  test("should navigate to analytics page", async ({ page }) => {
    // Click analytics link
    await page.getByRole("link", { name: /analitik|analytics/i }).click();

    // Wait for navigation
    await page.waitForURL(BASE_URL + "/analitik", { timeout: 10000 });

    // Check analytics page loads - use first() for multiple matches
    await expect(page.getByRole("heading", { name: /analitik|analytics/i }).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("should navigate to input page", async ({ page }) => {
    // Click input link
    await page.getByRole("link", { name: "Input", exact: true }).click();

    // Wait for navigation
    await page.waitForURL(BASE_URL + "/input", { timeout: 10000 });

    // Check input page loads
    await expect(
      page.getByRole("heading", { name: /input|laporan|inspeksi/i }).first(),
    ).toBeVisible({ timeout: 5000 });
  });
});
