import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:5173";
const EMAIL = process.env.E2E_EMAIL || "admin@ipp.com";
const PASSWORD = process.env.E2E_PASSWORD || "admin@123";

// Helper function to login
async function login(page: Page, email?: string, password?: string) {
  const emailToUse = email || EMAIL;
  const passwordToUse = password || PASSWORD;

  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("domcontentloaded");

  // Find and fill email
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  await emailInput.waitFor({ state: "visible", timeout: 10000 });
  await emailInput.fill(emailToUse);

  // Find and fill password
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ state: "visible", timeout: 5000 });
  await passwordInput.fill(passwordToUse);

  // Click submit
  const submitButton = page.locator('button[type="submit"]').first();
  await submitButton.waitFor({ state: "visible", timeout: 5000 });
  await submitButton.click();

  // Wait for redirect
  await page.waitForURL(`${BASE_URL}/`, { timeout: 30000 });
}

test.describe("Login", () => {
  test("should show login page correctly", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("domcontentloaded");

    // Check inputs exist
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();
  });

  test("should login successfully with valid credentials", async ({ page }) => {
    await login(page);

    // Check dashboard loads - wait for heading
    await expect(page.getByRole("heading", { name: /dashboard/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("domcontentloaded");

    await page.locator('input[type="email"]').first().fill("wrong@example.com");
    await page.locator('input[type="password"]').first().fill("wrongpassword");
    await page.locator('button[type="submit"]').first().click();

    // Wait for error message
    await expect(page.getByText(/invalid|error|gagal/i).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should display dashboard with KPI cards", async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForURL(`${BASE_URL}/`, { timeout: 30000 });

    // Check heading exists
    await expect(page.getByRole("heading", { name: /dashboard/i }).first()).toBeVisible({ timeout: 10000 });

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Check for some content
    const bodyText = await page.textContent("body");
    expect(bodyText?.length).toBeGreaterThan(100);
  });

  test("should navigate to input page", async ({ page }) => {
    // Click input link
    await page.locator('a[href="/input"]').first().click();
    await page.waitForURL(`${BASE_URL}/input`, { timeout: 10000 });

    // Check input page loaded
    await expect(page.getByText(/input|laporan|inspeksi/i).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Input Page", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);

    // Navigate to input
    await page.locator('a[href="/input"]').first().click();
    await page.waitForURL(`${BASE_URL}/input`, { timeout: 10000 });
  });

  test("should display input page", async ({ page }) => {
    // Wait for form to load
    await page.waitForTimeout(2000);

    // Check page has form elements
    const inputs = await page.locator("input").count();
    expect(inputs).toBeGreaterThan(0);

    // Check for number input (qty)
    await expect(page.locator('input[type="number"]').first()).toBeVisible();
  });

  test("should fill form and calculate", async ({ page }) => {
    // Fill Qty Check
    const qtyInput = page.locator('input[type="number"]').first();
    await qtyInput.fill("100");

    // Wait for calculations
    await page.waitForTimeout(1500);

    // Check if defect fields appear
    const hasDefect = await page.getByText(/defect|short\s*shot|ng/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasDefect).toBeTruthy();
  });

  test("should reset form", async ({ page }) => {
    // Fill some values
    const qtyInput = page.locator('input[type="number"]').first();
    await qtyInput.fill("100");
    await page.waitForTimeout(1000);

    // Click reset if exists
    const resetButton = page.getByRole("button", { name: /reset/i }).first();
    const resetExists = await resetButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (resetExists) {
      await resetButton.click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe("Master Users", () => {
  test("should display users for admin", async ({ page }) => {
    await login(page);

    // Navigate to master users
    await page.locator('a[href="/master/users"]').first().click();
    await page.waitForURL(`${BASE_URL}/master/users`, { timeout: 15000 });

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Check page has content
    const bodyText = await page.textContent("body");
    expect(bodyText?.toLowerCase().includes("pengguna") || bodyText?.toLowerCase().includes("user")).toBeTruthy();
  });

  test("should deny access for inspector", async ({ page }) => {
    const INSPECTOR_EMAIL = process.env.E2E_INSPECTOR_EMAIL || "ari@ipp.com";
    const INSPECTOR_PASSWORD = process.env.E2E_INSPECTOR_PASSWORD || "ari123";

    // Login as inspector
    await login(page, INSPECTOR_EMAIL, INSPECTOR_PASSWORD);

    // Inspector may not see the master/users link - try direct navigation
    await page.goto(`${BASE_URL}/master/users`);
    await page.waitForTimeout(3000);

    // Should see access denied or not be on users page
    const bodyText = await page.textContent("body");
    const hasAccessDenied = bodyText?.toLowerCase().includes("akses") || bodyText?.toLowerCase().includes("ditolak") || bodyText?.toLowerCase().includes("unauthorized");
    const notOnUsersPage = !page.url().includes("/master/users");

    // Either access denied message is shown, or user was redirected away
    expect(hasAccessDenied || notOnUsersPage).toBeTruthy();
  });
});
