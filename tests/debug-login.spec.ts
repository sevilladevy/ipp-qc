import { test, expect } from "@playwright/test";

// Debug helper for the login flow. Targets E2E_BASE_URL (local dev by
// default) so it never hits production by accident.
const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:5173";
const EMAIL = process.env.E2E_EMAIL || "admin@ipp.com";
const PASSWORD = process.env.E2E_PASSWORD || "admin@123";

test("debug login flow", async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  // Wait for client hydration before filling controlled inputs,
  // otherwise React re-render can clobber filled values.
  await page.waitForLoadState("networkidle");

  const emailInput = page.getByRole("textbox", { name: /email/i });
  const passwordInput = page.getByRole("textbox", { name: /password/i });
  await expect(emailInput).toBeVisible({ timeout: 10000 });
  console.log("Email input visible:", await emailInput.isVisible().catch(() => false));

  await emailInput.fill(EMAIL);
  await passwordInput.fill(PASSWORD);

  const submitButton = page.getByRole("button", { name: /login|masuk|submit/i });
  console.log("Submit button visible:", await submitButton.isVisible());
  await submitButton.click();

  await page.waitForURL(BASE_URL + "/", { timeout: 30000 });
  console.log("Current URL:", page.url());
  await expect(page.getByRole("heading", { name: /dashboard/i }).first()).toBeVisible({
    timeout: 10000,
  });
});
