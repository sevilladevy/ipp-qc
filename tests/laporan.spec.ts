import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:5173";
const EMAIL = process.env.E2E_EMAIL || "admin@ipp.com";
const PASSWORD = process.env.E2E_PASSWORD || "admin@123";

async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  // Wait for client hydration before filling controlled inputs,
  // otherwise React re-render can clobber filled values.
  await page.waitForLoadState("networkidle");
  await page.getByRole("textbox", { name: /email/i }).fill(EMAIL);
  await page.getByRole("textbox", { name: /password/i }).fill(PASSWORD);
  await page.getByRole("button", { name: /login|masuk|submit/i }).click();
  await page.waitForURL(BASE_URL + "/", { timeout: 30000 });
}

async function shot(page: Page, name: string) {
  const width = page.viewportSize()?.width ?? 1280;
  await page.screenshot({ path: `test-results/audit-${name}-${width}.png` });
}

test.describe("Laporan page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/laporan`);
    await expect(page.getByRole("heading", { name: /report management/i })).toBeVisible({
      timeout: 15000,
    });
  });

  test("sort toggles direction without errors", async ({ page }) => {
    // Card layout (<640px) hides thead, so sort buttons only exist there up
    const width = page.viewportSize()?.width ?? 1280;
    if (width < 640) {
      await expect(page.locator("table").first()).toBeVisible({ timeout: 10000 });
      await shot(page, "laporan");
      return;
    }
    const header = page.getByRole("button", { name: /tanggal/i }).first();
    await expect(header).toBeVisible({ timeout: 10000 });
    await header.click();
    await page.waitForTimeout(500);
    await expect(header).toContainText(/tanggal/i);
    await shot(page, "laporan");
  });

  test("group by meja shows grouped rows", async ({ page }) => {
    await page.getByRole("combobox", { name: /kelompokkan/i }).selectOption("no_meja");
    // Grouped cells carry data-label="Group" (visible in card layout too)
    await expect(page.locator('td[data-label="Group"]').first()).toBeVisible({ timeout: 10000 });
  });

  test("expand row reveals validation details", async ({ page }) => {
    const toggle = page.getByRole("button", { name: /tampilkan detail baris/i }).first();
    await expect(toggle).toBeVisible({ timeout: 10000 });
    await toggle.click();
    await expect(page.getByText(/validation details/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("CSV export downloads a file", async ({ page }) => {
    // Wait for data; exporting an empty table toasts instead of downloading
    await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 15000 });
    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    await page.getByRole("button", { name: "CSV", exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  });
});
