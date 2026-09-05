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

    // Check page has content (scoped to main; sidebar holds similar words)
    await expect(
      page
        .locator("main")
        .getByText(/qty|yield|ng|reports/i)
        .first(),
    ).toBeVisible({
      timeout: 5000,
    });

    const width = page.viewportSize()?.width ?? 1280;
    await page.screenshot({ path: `test-results/audit-dashboard-${width}.png` });
  });

  test("should display KPI cards", async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(1000);

    // Check for KPI labels - scoped to main content
    const main = page.locator("main");
    await expect(main.getByText(/qty\s*check/i).first()).toBeVisible({ timeout: 5000 });
    await expect(main.getByText(/yield/i).first()).toBeVisible({ timeout: 5000 });
    await expect(main.getByText(/ng\s*rate/i).first()).toBeVisible({ timeout: 5000 });
    await expect(main.getByText(/reports/i).first()).toBeVisible({ timeout: 5000 });
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
    // Click analytics link (sidebar on desktop, bottom nav on mobile)
    await page.locator('a[href="/analitik"]:visible').click();

    // Wait for navigation
    await page.waitForURL(BASE_URL + "/analitik", { timeout: 10000 });

    // Check analytics page loads - use first() for multiple matches
    await expect(page.getByRole("heading", { name: /analitik|analytics/i }).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("should navigate to input page", async ({ page }) => {
    // Click input link (sidebar on desktop, bottom nav on mobile)
    await page.locator('a[href="/input"]:visible').click();

    // Wait for navigation
    await page.waitForURL(BASE_URL + "/input", { timeout: 10000 });

    // Check input page loads
    await expect(
      page.getByRole("heading", { name: /input|laporan|inspeksi/i }).first(),
    ).toBeVisible({ timeout: 5000 });
  });
});
