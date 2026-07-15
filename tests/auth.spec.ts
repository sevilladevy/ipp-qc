import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:5173";
const EMAIL = process.env.E2E_EMAIL || "admin@ipp.com";
const PASSWORD = process.env.E2E_PASSWORD || "admin@123";

test.describe("Login", () => {
  test("should show login page correctly", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Check page loads without errors
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check page title contains IPP
    await expect(page.locator("text=Injeksi Plastik Pasifik")).toBeVisible();
  });

  test("should show validation error for empty fields", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Submit without filling
    await page.click('button[type="submit"]');

    // Toast should appear
    await expect(page.locator("text=Email dan password wajib diisi")).toBeVisible();
  });

  test("should login successfully with valid credentials", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Fill credentials
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);

    // Submit
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(BASE_URL + "/", { timeout: 30000 });

    // Check dashboard loads
    await expect(page.locator("text=Dashboard")).toBeVisible();
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Fill with wrong credentials
    await page.fill('input[type="email"]', "wrong@example.com");
    await page.fill('input[type="password"]', "wrongpassword");

    // Submit
    await page.click('button[type="submit"]');

    // Error should appear
    await expect(page.locator("text=Invalid login credentials")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(BASE_URL + "/", { timeout: 30000 });
  });

  test("should redirect to login when not authenticated", async ({ page }) => {
    // Clear cookies to logout
    await page.context().clearCookies();

    // Try to access protected page
    await page.goto(`${BASE_URL}/input`);

    // Should redirect to login
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  });

  test("should show user email in header", async ({ page }) => {
    // Check user email is displayed
    await expect(page.locator(`text=${EMAIL}`).first()).toBeVisible();
  });

  test("should logout successfully", async ({ page }) => {
    // Click logout button
    await page.locator('button[title="Logout"]').click();

    // Should redirect to login
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  });
});
