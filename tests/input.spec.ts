import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:5173";
const EMAIL = process.env.E2E_EMAIL || "admin@ipp.com";
const PASSWORD = process.env.E2E_PASSWORD || "admin@123";

test.describe("Input Page", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(BASE_URL + "/", { timeout: 30000 });

    // Navigate to input
    await page.click('a[href="/input"]');
    await page.waitForURL(BASE_URL + "/input", { timeout: 10000 });
  });

  test("should display input page", async ({ page }) => {
    // Check page title
    await expect(page.locator("h1:has-text('Input Laporan Inspeksi')")).toBeVisible();
  });

  test("should display form fields", async ({ page }) => {
    // Check for form fields
    await expect(page.locator("text=Tanggal")).toBeVisible();
    await expect(page.locator("text=Shift")).toBeVisible();
    await expect(page.locator("text=No Meja")).toBeVisible();
    await expect(page.locator("text=Part")).toBeVisible();
    await expect(page.locator("text=Jam Mulai")).toBeVisible();
    await expect(page.locator("text=Jam Selesai")).toBeVisible();
    await expect(page.locator("text=Qty Check")).toBeVisible();
  });

  test("should show KPI cards", async ({ page }) => {
    // Check for KPI cards
    await expect(page.locator("text=Pass Rate")).toBeVisible();
    await expect(page.locator("text=Qty Check")).toBeVisible();
    await expect(page.locator("text=OK Parts")).toBeVisible();
    await expect(page.locator("text=NG Parts")).toBeVisible();
  });

  test("should fill form and calculate", async ({ page }) => {
    // Fill date (default should be today)
    const dateInput = page.locator('input[type="date"]').first();
    await expect(dateInput).toBeVisible();

    // Fill shift
    await page.selectOption("select:has(#shift)", "A").catch(() => {
      // If specific selector doesn't work, try generic
    });

    // Fill Qty Check
    const qtyInput = page.locator('input[type="number"]').first();
    await qtyInput.fill("100");

    // Wait for calculations
    await page.waitForTimeout(500);

    // Check if defect fields appear
    await expect(page.locator("text=Short Shot")).toBeVisible();
  });

  test("should show defect input when qty > 0", async ({ page }) => {
    // Fill Qty Check
    const qtyInput = page.locator('input[type="number"]').first();
    await qtyInput.fill("100");

    // Wait for UI to update
    await page.waitForTimeout(500);

    // Defect inputs should be visible
    await expect(page.locator("text=Defect Breakdown")).toBeVisible();
  });

  test("should select meja", async ({ page }) => {
    // Open meja dropdown
    const mejaSelect = page.locator("select").nth(2);
    await mejaSelect.selectOption({ index: 1 });

    // Wait for update
    await page.waitForTimeout(500);
  });

  test("should reset form", async ({ page }) => {
    // Fill some values
    const qtyInput = page.locator('input[type="number"]').first();
    await qtyInput.fill("100");

    // Click reset
    await page.click('button:has-text("Reset All")');

    // Wait for reset
    await page.waitForTimeout(500);

    // Form should be cleared
    await expect(qtyInput).toHaveValue("0");
  });

  test("should show validation error for invalid submission", async ({ page }) => {
    // Try to submit without filling required fields
    await page.click('button:has-text("Save Report")');

    // Error should appear
    await expect(
      page.locator("text=Pilih meja inspeksi").or(page.locator("text=Part No wajib")),
    ).toBeVisible({ timeout: 5000 });
  });
});
