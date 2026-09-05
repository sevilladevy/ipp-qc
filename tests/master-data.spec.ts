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

test.describe("Master Data pages", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("meja page renders, validates duplicates, cancels modal", async ({ page }) => {
    await page.goto(`${BASE_URL}/master/meja`);
    await expect(page.getByRole("heading", { name: /meja inspeksi/i }).first()).toBeVisible({
      timeout: 10000,
    });
    await shot(page, "master-meja");

    // Table present with data
    await expect(page.locator("table").first()).toBeAttached({ timeout: 10000 });

    // Add modal opens and cancels cleanly
    await page.getByRole("button", { name: /tambah meja/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.getByRole("button", { name: /batal/i }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Duplicate number is rejected without writing
    await page.getByRole("button", { name: /tambah meja/i }).click();
    const firstNo = await page.locator("tbody tr td").first().textContent();
    const existingNo = firstNo?.replace(/\D/g, "") ?? "1";
    await dialog.locator('input[type="number"]').first().fill(existingNo);
    await dialog.getByRole("button", { name: /^simpan$/i }).click();
    await expect(page.locator("[data-sonner-toast]")).toContainText(/sudah terdaftar/i, {
      timeout: 8000,
    });
    await dialog.getByRole("button", { name: /batal/i }).click();
  });

  test("part page searches and locks part_no on edit", async ({ page }) => {
    await page.goto(`${BASE_URL}/master/part`);
    await expect(page.getByRole("heading", { name: /part/i }).first()).toBeVisible({
      timeout: 10000,
    });
    await shot(page, "master-part");

    // Search narrows the table
    await page.getByRole("textbox", { name: /cari part/i }).fill("E2E-ALPHA");
    await expect(page.locator("table")).toContainText("E2E-ALPHA", { timeout: 10000 });
    await page.getByRole("textbox", { name: /cari part/i }).fill("");

    // Edit locks Part No (silently discarded otherwise)
    await page
      .getByRole("button", { name: /^edit part/i })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    const partNoInput = dialog.locator("input[value][readonly]");
    await expect(partNoInput.first()).toBeVisible();
    await dialog.getByRole("button", { name: /batal/i }).click();
  });

  test("defect page reorders and validates kode format", async ({ page }) => {
    await page.goto(`${BASE_URL}/master/defect-types`);
    await expect(page.getByRole("heading", { name: /jenis defect|defect/i }).first()).toBeVisible({
      timeout: 10000,
    });
    await shot(page, "master-defect");

    // Reorder mode enters and cancels
    await page.getByRole("button", { name: /atur urutan/i }).click();
    await expect(page.getByRole("button", { name: /simpan urutan/i })).toBeVisible({
      timeout: 5000,
    });
    await page.getByRole("button", { name: /^batal$/i }).click();

    // Invalid kode is rejected without writing
    await page.getByRole("button", { name: /tambah defect/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.getByPlaceholder(/misal/i).fill("kode salah!");
    await dialog.getByRole("textbox", { name: /nama defect/i }).fill("E2E Invalid Check");
    await dialog.getByRole("button", { name: /^simpan$/i }).click();
    await expect(page.locator("[data-sonner-toast]")).toContainText(/huruf kapital/i, {
      timeout: 8000,
    });
    await dialog.getByRole("button", { name: /batal/i }).click();
  });
});
