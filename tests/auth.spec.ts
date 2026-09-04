import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:5173";
const EMAIL = process.env.E2E_EMAIL || "admin@ipp.com";
const PASSWORD = process.env.E2E_PASSWORD || "admin@123";

test.describe("Login", () => {
  test("should show login page correctly", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    // Wait for client hydration before filling controlled inputs,
    // otherwise React re-render can clobber filled values.
    await page.waitForLoadState("networkidle");

    // Check page loads without errors
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /password/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /login|masuk|submit/i })).toBeVisible();

    // Check page title contains IPP - use first() to avoid strict mode violation
    await expect(page.getByRole("heading", { name: /injeksi plastik pasifik/i })).toBeVisible();
  });

  test("should show validation error for empty fields", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    // Wait for client hydration before filling controlled inputs,
    // otherwise React re-render can clobber filled values.
    await page.waitForLoadState("networkidle");

    // Submit without filling - native constraint validation blocks
    // submit on the required inputs, so the form must stay put.
    await page.getByRole("button", { name: /login|masuk|submit/i }).click();

    await expect(page).toHaveURL(/\/login/);
    const emailValid = await page
      .getByRole("textbox", { name: /email/i })
      .evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(emailValid).toBe(false);
  });

  test("should login successfully with valid credentials", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    // Wait for client hydration before filling controlled inputs,
    // otherwise React re-render can clobber filled values.
    await page.waitForLoadState("networkidle");

    // Fill credentials
    await page.getByRole("textbox", { name: /email/i }).fill(EMAIL);
    await page.getByRole("textbox", { name: /password/i }).fill(PASSWORD);

    // Submit
    await page.getByRole("button", { name: /login|masuk|submit/i }).click();

    // Wait for redirect to dashboard
    await page.waitForURL(BASE_URL + "/", { timeout: 30000 });

    // Check dashboard loads - use first() for multiple matches
    await expect(page.getByRole("heading", { name: /dashboard/i }).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    // Wait for client hydration before filling controlled inputs,
    // otherwise React re-render can clobber filled values.
    await page.waitForLoadState("networkidle");

    // Fill with wrong credentials
    await page.getByRole("textbox", { name: /email/i }).fill("wrong@example.com");
    await page.getByRole("textbox", { name: /password/i }).fill("wrongpassword");

    // Submit
    await page.getByRole("button", { name: /login|masuk|submit/i }).click();

    // Error should appear - use first() for multiple matches
    await expect(page.getByText(/invalid login credentials/i).first()).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe("Authentication", () => {
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

  test("should redirect to login when not authenticated", async ({ page }) => {
    // Supabase auth persists in local/session storage, not cookies
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Try to access protected page
    await page.goto(`${BASE_URL}/input`);

    // Should redirect to login
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible({ timeout: 10000 });
  });

  test("should show user email in header", async ({ page }) => {
    // Check user email is displayed
    await expect(page.getByText(EMAIL).first()).toBeVisible();
  });

  test("should logout successfully", async ({ page }) => {
    // Click logout button
    await page.getByRole("button", { name: /logout|sign out|keluar/i }).click();

    // Should redirect to login
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible({ timeout: 10000 });
  });
});
