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

  test("should toggle password visibility", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    // Wait for client hydration before filling controlled inputs,
    // otherwise React re-render can clobber filled values.
    await page.waitForLoadState("networkidle");

    const passwordInput = page.getByRole("textbox", { name: /password/i });
    await passwordInput.fill("secret123");
    await expect(passwordInput).toHaveAttribute("type", "password");

    const toggle = page.getByRole("button", { name: /tampilkan password/i });
    await toggle.click();
    await expect(passwordInput).toHaveAttribute("type", "text");
    await expect(passwordInput).toHaveValue("secret123");
    await expect(page.getByRole("button", { name: /sembunyikan password/i })).toBeVisible();

    await page.getByRole("button", { name: /sembunyikan password/i }).click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("remember me off keeps the session out of localStorage", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    // Wait for client hydration before filling controlled inputs,
    // otherwise React re-render can clobber filled values.
    await page.waitForLoadState("networkidle");

    await page.getByRole("textbox", { name: /email/i }).fill(EMAIL);
    await page.getByRole("textbox", { name: /password/i }).fill(PASSWORD);
    // Unchecking reboots auth on session storage with no page reload.
    await page.getByRole("checkbox", { name: /ingat saya/i }).uncheck();
    await expect(page.getByRole("checkbox", { name: /ingat saya/i })).not.toBeChecked();
    await page.getByRole("button", { name: /login|masuk|submit/i }).click();
    await page.waitForURL(BASE_URL + "/", { timeout: 30000 });

    const stores = await page.evaluate(() => ({
      local: Object.keys(localStorage).filter((k) => k.startsWith("sb-")),
      session: Object.keys(sessionStorage).filter((k) => k.startsWith("sb-")),
    }));
    expect(stores.local).toHaveLength(0);
    expect(stores.session.length).toBeGreaterThan(0);
  });

  test("remember me on persists the session in localStorage", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    // Wait for client hydration before filling controlled inputs,
    // otherwise React re-render can clobber filled values.
    await page.waitForLoadState("networkidle");

    await page.getByRole("textbox", { name: /email/i }).fill(EMAIL);
    await page.getByRole("textbox", { name: /password/i }).fill(PASSWORD);
    await expect(page.getByRole("checkbox", { name: /ingat saya/i })).toBeChecked();
    await page.getByRole("button", { name: /login|masuk|submit/i }).click();
    await page.waitForURL(BASE_URL + "/", { timeout: 30000 });

    const localKeys = await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith("sb-")),
    );
    expect(localKeys.length).toBeGreaterThan(0);
  });

  test("remembered email prefills only when remember me is on", async ({ page }) => {
    async function loginAndOut(remember: boolean) {
      await page.goto(`${BASE_URL}/login`);
      // Wait for client hydration before filling controlled inputs,
      // otherwise React re-render can clobber filled values.
      await page.waitForLoadState("networkidle");
      await page.getByRole("textbox", { name: /email/i }).fill(EMAIL);
      await page.getByRole("textbox", { name: /password/i }).fill(PASSWORD);
      if (remember) {
        await expect(page.getByRole("checkbox", { name: /ingat saya/i })).toBeChecked();
      } else {
        // Unchecking reboots auth on session storage with no page reload.
        await page.getByRole("checkbox", { name: /ingat saya/i }).uncheck();
        await expect(page.getByRole("checkbox", { name: /ingat saya/i })).not.toBeChecked();
      }
      await page.getByRole("button", { name: /login|masuk|submit/i }).click();
      await page.waitForURL(BASE_URL + "/", { timeout: 30000 });
      await page.getByRole("button", { name: /logout/i }).click();
      await page.getByRole("textbox", { name: /email/i }).waitFor({ timeout: 10000 });
    }

    await loginAndOut(true);
    await expect(page.getByRole("textbox", { name: /email/i })).toHaveValue(EMAIL);

    await loginAndOut(false);
    await expect(page.getByRole("textbox", { name: /email/i })).toHaveValue("");
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
