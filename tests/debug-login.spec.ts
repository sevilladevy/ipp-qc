import { test, expect } from "@playwright/test";

// Simple debug test
test("debug login flow", async ({ page }) => {
  const BASE_URL = "https://ipp-quality.vercel.app";
  const EMAIL = "admin@ipp.com";
  const PASSWORD = "admin123";

  // Go to login page
  await page.goto(`${BASE_URL}/login`);

  // Wait for page to load
  await page.waitForLoadState("networkidle");

  // Debug: print all inputs
  const inputs = await page.locator("input").all();
  console.log(`Found ${inputs.length} inputs`);

  // Print page content
  const content = await page.content();
  console.log("Page has login form:", content.includes("email") || content.includes("login"));

  // Try to find and fill email
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  const emailVisible = await emailInput.isVisible().catch(() => false);
  console.log("Email input visible:", emailVisible);

  if (emailVisible) {
    await emailInput.fill(EMAIL);

    // Find password
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(PASSWORD);

    // Find submit button
    const submitButton = page.locator('button[type="submit"]').first();
    console.log("Submit button visible:", await submitButton.isVisible());

    // Click submit
    await submitButton.click();

    // Wait a bit and check URL
    await page.waitForTimeout(5000);
    console.log("Current URL:", page.url());
    console.log("Is on dashboard:", page.url().endsWith("/") || page.url().endsWith("/"));
  }
});
