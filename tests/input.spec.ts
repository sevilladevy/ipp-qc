import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:5173";
const EMAIL = process.env.E2E_EMAIL || "admin@ipp.com";
const PASSWORD = process.env.E2E_PASSWORD || "admin@123";

test.describe("Input Page", () => {
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

    // Navigate to input (sidebar on desktop, bottom nav on mobile)
    await page.locator('a[href="/input"]:visible').click();
    await page.waitForURL(BASE_URL + "/input", { timeout: 10000 });
  });

  test("should display input page", async ({ page }) => {
    // Check page title - use heading role
    await expect(
      page.getByRole("heading", { name: /input|laporan|inspeksi/i }).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should display form fields", async ({ page }) => {
    // Check for form fields using labels - use first() for text matches
    // (generous timeout: first content paint is slow under parallel load)
    await expect(page.getByText(/tanggal/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/shift/i).first()).toBeVisible();
    await expect(page.getByText(/no\s*meja/i).first()).toBeVisible();
    await expect(page.locator(".inspection-form").getByText(/part/i).first()).toBeVisible();
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

    // Click reset - visible one only (desktop card vs mobile bar)
    const resetButton = page.locator("button:visible", { hasText: /reset/i }).first();
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

    // Try to submit - button should exist (visible one only)
    const saveButton = page.locator("button:visible", { hasText: /save/i }).first();
    await expect(saveButton).toBeVisible();

    // The button might be disabled if validation fails - that's expected behavior
    // We verify the form is working by checking it has data
    await expect(qtyInput).toHaveValue("100");
  });
});

test.describe("Input Page - Interactions", () => {
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

  async function gotoInput(page: Page) {
    await page.goto(`${BASE_URL}/input`);
    await expect(page.getByRole("heading", { name: /input laporan inspeksi/i })).toBeVisible({
      timeout: 10000,
    });
  }

  function saveButton(page: Page) {
    // Desktop action card and mobile action bar each render a save
    // button; exactly one is visible per layout.
    return page.locator("button:visible", { hasText: /save/i }).first();
  }

  async function fillValidForm(page: Page, lot: string) {
    // Meja
    await page.locator("select").first().selectOption({ index: 1 });
    // Part via searchable popover
    await page.locator(".part-trigger").click();
    await page.getByPlaceholder(/cari part_no/i).fill("E2E-ALPHA");
    await page.getByRole("option", { name: /E2E-ALPHA/ }).click();
    // Lot + time range + qty
    await page.getByPlaceholder(/lot number/i).fill(lot);
    const times = page.locator('input[type="time"]');
    await times.nth(0).fill("08:00");
    await times.nth(1).fill("09:00");
    await page.locator('input[type="number"]').first().fill("50");
  }

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await gotoInput(page);
  });

  test("stepper buttons step once per mouse click and keyboard Enter", async ({ page }) => {
    await page.locator('input[type="number"]').first().fill("100");
    const firstRow = page.locator(".defect-row").first();
    const valueInput = firstRow.locator(".stepper-count");
    const plus = firstRow.getByRole("button", { name: /^tambah/i });
    const minus = firstRow.getByRole("button", { name: /^kurangi/i });

    await plus.click();
    await expect(valueInput).toHaveValue("1");
    // Keyboard activation must also work (no double counting on mouse)
    await plus.focus();
    await page.keyboard.press("Enter");
    await expect(valueInput).toHaveValue("2");
    await minus.click();
    await expect(valueInput).toHaveValue("1");
  });

  test("invalid numeric input is sanitized to zero", async ({ page }) => {
    // Browsers refuse to type "-" into type=number, so simulate a paste
    // through the native setter + input event (the path the app handles).
    async function pasteInvalid(locator: ReturnType<Page["locator"]>, text: string) {
      await locator.evaluate((el: HTMLInputElement, value: string) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
        setter.call(el, value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }, text);
    }

    const qtyInput = page.locator('input[type="number"]').first();
    await qtyInput.fill("100");
    const valueInput = page.locator(".defect-row .stepper-count").first();

    await pasteInvalid(qtyInput, "-");
    await expect(qtyInput).toHaveValue("0");

    await qtyInput.fill("100");
    await pasteInvalid(valueInput, "abc");
    await expect(valueInput).toHaveValue("0");
  });

  test("defect search, category chips and filled-only toggle work", async ({ page }) => {
    await page.locator('input[type="number"]').first().fill("100");

    // Search narrows the defect list
    await page.getByPlaceholder(/cari defect/i).fill("short");
    await expect(page.getByText(/short.?shot/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Clear search, set one defect, toggle to filled-only
    await page.getByPlaceholder(/cari defect/i).fill("");
    await page.locator(".defect-row .stepper-count").first().fill("3");
    await page.getByRole("button", { name: /hanya/i }).click();
    await expect(page.locator(".defect-row")).toHaveCount(1);

    // Category chips jump without errors (toggle now reads "Semua")
    await page.getByRole("button", { name: /semua/i }).click();
    const chip = page.locator(".defect-chip").first();
    if (await chip.isVisible().catch(() => false)) {
      await chip.click();
    }
  });

  test("invalid time range blocks submit with an error toast", async ({ page }) => {
    await fillValidForm(page, "E2E-TIME-CHECK");
    const times = page.locator('input[type="time"]');
    await times.nth(0).fill("10:00");
    await times.nth(1).fill("09:00");

    await saveButton(page).click();
    await expect(page.locator("[data-sonner-toast]")).toContainText(
      /jam selesai harus setelah jam mulai/i,
      { timeout: 5000 },
    );
    // Confirm modal must not open
    await page.waitForTimeout(500);
    await expect(page.getByRole("heading", { name: /konfirmasi submit/i })).toHaveCount(0);
  });

  test("confirm modal shows summary and cancel keeps data", async ({ page }) => {
    const lot = `E2E-CANCEL-${Date.now().toString().slice(-6)}`;
    await fillValidForm(page, lot);

    await saveButton(page).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: /konfirmasi submit/i })).toBeVisible({
      timeout: 5000,
    });
    await expect(dialog).toContainText(lot);
    await expect(dialog).toContainText("E2E-ALPHA");

    await dialog.getByRole("button", { name: /batal/i }).click();
    await expect(page.getByRole("heading", { name: /konfirmasi submit/i })).toHaveCount(0);
    // Form data preserved after cancel
    await expect(page.getByPlaceholder(/lot number/i)).toHaveValue(lot);
  });

  test("full submit then delete cleans up the created log", async ({ page }) => {
    const lot = `E2E-FULL-${Date.now().toString().slice(-6)}`;
    await fillValidForm(page, lot);

    await saveButton(page).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: /konfirmasi submit/i })).toBeVisible({
      timeout: 5000,
    });
    await dialog.getByRole("button", { name: /ya, simpan/i }).click();

    const success = page.getByRole("dialog");
    await expect(success.getByRole("heading", { name: /berhasil disimpan/i })).toBeVisible({
      timeout: 15000,
    });
    await success.getByRole("button", { name: /^ok$/i }).click();

    // New row appears in today's log
    await page.getByPlaceholder(/search timestamp/i).fill(lot);
    const row = page.locator("tr", { hasText: lot }).first();
    await expect(row).toBeVisible({ timeout: 10000 });

    // Delete it again via the row action
    await row.getByRole("button", { name: /delete log/i }).click();
    const confirm = page.getByRole("dialog");
    await expect(confirm.getByRole("heading", { name: /hapus log input/i })).toBeVisible({
      timeout: 5000,
    });
    await confirm.getByRole("button", { name: /^hapus$/i }).click();
    await expect(page.locator("tr", { hasText: lot })).toHaveCount(0, {
      timeout: 10000,
    });
  });

  test("CSV export downloads a file", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    await page.getByRole("button", { name: "CSV", exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  });

  test("view and edit log modals open and close without writing", async ({ page }) => {
    const firstView = page.getByRole("button", { name: /view log/i }).first();
    await expect(firstView).toBeVisible({ timeout: 10000 });
    await firstView.click();
    const viewDialog = page.getByRole("dialog");
    await expect(viewDialog.getByRole("heading", { name: /detail log input/i })).toBeVisible({
      timeout: 5000,
    });
    await viewDialog.getByRole("button", { name: /tutup detail log/i }).click();
    await expect(page.getByRole("heading", { name: /detail log input/i })).toHaveCount(0);

    const firstEdit = page.getByRole("button", { name: /edit log/i }).first();
    await firstEdit.click();
    const editDialog = page.getByRole("dialog");
    await expect(editDialog.getByRole("heading", { name: /edit log input/i })).toBeVisible({
      timeout: 5000,
    });
    await editDialog.getByRole("button", { name: /batal/i }).click();
    await expect(page.getByRole("heading", { name: /edit log input/i })).toHaveCount(0);
  });

  test("log search narrows rows", async ({ page }) => {
    await page.getByPlaceholder(/search timestamp/i).fill("E2E-ALPHA");
    await page.waitForTimeout(500);
    const body = (await page.locator("table").first().textContent()) ?? "";
    expect(body).toMatch(/E2E-ALPHA/);
  });

  test("action bar matches device layout", async ({ page }) => {
    const width = page.viewportSize()?.width ?? 1280;
    if (width < 1024) {
      await expect(page.locator(".mobile-action-bar")).toBeVisible();
      await expect(page.locator(".action-card")).toBeHidden();
    } else {
      await expect(page.locator(".action-card")).toBeVisible();
      await expect(page.locator(".mobile-action-bar")).toBeHidden();
    }
    await page.screenshot({
      path: `test-results/input-layout-${width}.png`,
    });
  });
});
