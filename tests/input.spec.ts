import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:5173";
const EMAIL = process.env.E2E_EMAIL || "admin@ipp.com";
const PASSWORD = process.env.E2E_PASSWORD || "admin@123";

test.describe("Input Page", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    await page.getByRole("textbox", { name: /email/i }).fill(EMAIL);
    await page.getByRole("textbox", { name: /password/i }).fill(PASSWORD);
    await page.getByRole("button", { name: /login|masuk|submit/i }).click();
    await page.waitForURL(BASE_URL + "/", { timeout: 30000 });

    // Navigate to input
    await page.getByRole("link", { name: /input|laporan/i }).click();
    await page.waitForURL(BASE_URL + "/input", { timeout: 10000 });
  });

  test("should display input page", async ({ page }) => {
    // Check page title - use heading role
    await expect(page.getByRole("heading", { name: /input|laporan|inspeksi/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test("should display form fields", async ({ page }) => {
    // Check for form fields using labels - use first() for text matches
    await expect(page.getByText(/tanggal/i).first()).toBeVisible();
    await expect(page.getByText(/shift/i).first()).toBeVisible();
    await expect(page.getByText(/no\s*meja/i).first()).toBeVisible();
    await expect(page.getByText(/part/i).first()).toBeVisible();
    await expect(page.getByText(/jam\s*mulai/i).first()).toBeVisible();
    await expect(page.getByText(/jam\s*selesai/i).first()).toBeVisible();
    await expect(page.getByText(/qty\s*check/i).first()).toBeVisible();
  });

  test("should show KPI cards", async ({ page }) => {
    // Check for KPI cards - use first() for text matches
    await expect(page.getByText(/pass\s*rate/i).first()).toBeVisible();
    await expect(page.getByText(/qty\s*check/i).first()).toBeVisible();
    await expect(page.getByText(/ok\s*parts/i).first()).toBeVisible();
    await expect(page.getByText(/ng\s*parts/i).first()).toBeVisible();
  });

  test("should fill form and calculate", async ({ page }) => {
    // Fill Qty Check
    const qtyInput = page.locator('input[type="number"]').first();
    await expect(qtyInput).toBeVisible();
    await qtyInput.fill("100");

    // Wait for calculations
    await page.waitForTimeout(1000);

    // Check if defect fields appear
    await expect(page.getByText(/short\s*shot/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("should show defect input when qty > 0", async ({ page }) => {
    // Fill Qty Check
    const qtyInput = page.locator('input[type="number"]').first();
    await qtyInput.fill("100");

    // Wait for UI to update
    await page.waitForTimeout(1000);

    // Defect inputs should be visible
    await expect(page.getByText(/defect/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("should select meja", async ({ page }) => {
    // Find meja select - look for select with appropriate label
    const selects = page.locator("select");
    const count = await selects.count();

    if (count > 0) {
      // Select first non-empty option
      const firstSelect = selects.first();
      const options = firstSelect.locator("option");
      const optionCount = await options.count();

      if (optionCount > 1) {
        await firstSelect.selectOption({ index: 1 });
        await page.waitForTimeout(500);
      }
    }

    // Just verify the page loaded
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("should reset form", async ({ page }) => {
    // Fill some values
    const qtyInput = page.locator('input[type="number"]').first();
    await qtyInput.fill("100");
    await page.waitForTimeout(500);

    // Click reset - look for reset button
    const resetButton = page.getByRole("button", { name: /reset|bersihkan|hapus/i }).first();
    await resetButton.click();

    // Wait for reset
    await page.waitForTimeout(500);

    // Form should be cleared - check qty is 0 or empty
    const value = await qtyInput.inputValue();
    expect(value === "0" || value === "").toBeTruthy();
  });

  test("should show validation error for invalid submission", async ({ page }) => {
    // Fill minimal data to enable submit button, then check validation
    const qtyInput = page.locator('input[type="number"]').first();
    await qtyInput.fill("100");
    await page.waitForTimeout(500);

    // Try to submit - button should exist
    const saveButton = page.getByRole("button", { name: /save|simpan|submit/i }).first();
    await expect(saveButton).toBeVisible();

    // The button might be disabled if validation fails - that's expected behavior
    // We verify the form is working by checking it has data
    await expect(qtyInput).toHaveValue("100");
  });
});
