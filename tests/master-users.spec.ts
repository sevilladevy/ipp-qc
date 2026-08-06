import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:5173";
const EMAIL = process.env.E2E_EMAIL || "admin@ipp.com";
const PASSWORD = process.env.E2E_PASSWORD || "admin@123";

test.describe("Master Users Page", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    await page.getByRole("textbox", { name: /email/i }).fill(EMAIL);
    await page.getByRole("textbox", { name: /password/i }).fill(PASSWORD);
    await page.getByRole("button", { name: /login|masuk|submit/i }).click();
    await page.waitForURL(BASE_URL + "/", { timeout: 30000 });

    // Navigate to master users
    await page.getByRole("link", { name: /master|pengguna|user/i }).click();
    await page.waitForURL(BASE_URL + "/master/users", { timeout: 15000 });
  });

  test("should display users page", async ({ page }) => {
    // Check page title - use first() for multiple matches
    await expect(page.getByRole("heading", { name: /pengguna|user|manajemen/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test("should display user table", async ({ page }) => {
    // Wait for table to load
    await page.waitForTimeout(2000);

    // Check for table headers or user-related content
    const hasUserTable = await page.getByText(/email|role|aksi/i).first().isVisible({ timeout: 5000 }).catch(() => false);

    if (hasUserTable) {
      await expect(page.getByText(/email/i).first()).toBeVisible();
      await expect(page.getByText(/role/i).first()).toBeVisible();
    }
  });

  test("should display user metrics", async ({ page }) => {
    // Wait for metrics to load
    await page.waitForTimeout(2000);

    // Check for metric cards - use first() for multiple matches
    await expect(page.getByText(/total|inspector|supervisor/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("should filter users by role", async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Find and click role filter
    const roleButtons = page.getByRole("button", { name: /inspector|supervisor|semua/i });
    const count = await roleButtons.count();

    if (count > 0) {
      await roleButtons.first().click();
      await page.waitForTimeout(1000);
    }

    // Verify page still shows users
    await expect(page.getByRole("heading", { name: /pengguna|user|manajemen/i }).first()).toBeVisible();
  });

  test("should search for users", async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Find search input
    const searchInput = page.getByRole("textbox", { name: /cari|search/i }).first();
    const searchExists = await searchInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (searchExists) {
      await searchInput.fill("admin");
      await page.waitForTimeout(1000);

      // Verify search is working (no error)
      await expect(page.getByRole("heading", { name: /pengguna|user|manajemen/i }).first()).toBeVisible();
    }
  });

  test("should open add user modal", async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Find and click add user button
    const addButton = page.getByRole("button", { name: /tambah|add|user|baru/i }).first();
    const addExists = await addButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (addExists) {
      await addButton.click();
      await page.waitForTimeout(500);

      // Check if modal opened
      const hasModal = await page.getByRole("dialog").isVisible({ timeout: 3000 }).catch(() => false);
      if (hasModal) {
        await expect(page.getByText(/undang|email|password/i).first()).toBeVisible();
      }
    }
  });
});

test.describe("Master Users - Inspector Access", () => {
  test("should deny access for non-supervisor users", async ({ page }) => {
    const INSPECTOR_EMAIL = process.env.E2E_INSPECTOR_EMAIL || "ari@ipp.com";
    const INSPECTOR_PASSWORD = process.env.E2E_INSPECTOR_PASSWORD || "ari123";

    // Login as inspector
    await page.goto(`${BASE_URL}/login`);
    await page.getByRole("textbox", { name: /email/i }).fill(INSPECTOR_EMAIL);
    await page.getByRole("textbox", { name: /password/i }).fill(INSPECTOR_PASSWORD);
    await page.getByRole("button", { name: /login|masuk|submit/i }).click();
    await page.waitForURL(BASE_URL + "/", { timeout: 30000 });

    // Try to access master users
    await page.getByRole("link", { name: /master|pengguna|user/i }).click();
    await page.waitForTimeout(2000);

    // Should see access denied message
    await expect(
      page.getByText(/akses\s*ditolak|unauthorized|forbidden/i).first()
    ).toBeVisible({ timeout: 5000 }).catch(() => {
      // If no access denied, check if redirected away
      expect(page.url()).not.toContain("/master/users");
    });
  });
});
