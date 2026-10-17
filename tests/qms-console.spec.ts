import { test, expect } from "@playwright/test";

// Regression guards for the two console-error classes fixed in commit 74e16a4:
//   1. QMS tables missing on the deployed DB → PostgREST PGRST204/205 spam.
//   2. Google Fonts <link> blocked by the CSP (`style-src 'self'`).
// Both must stay silent now that @fontsource/inter is bundled and the QMS
// tables exist.

function collectConsole(page: import("@playwright/test").Page) {
  const messages: string[] = [];
  page.on("console", (msg) => messages.push(msg.text()));
  page.on("pageerror", (err) => messages.push(err.message));
  return messages;
}

test.describe("Console hygiene", () => {
  test("login page has no Google Fonts CSP violation", async ({ page }) => {
    const messages = collectConsole(page);

    await page.goto("/login", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    const violations = messages.filter(
      (m) =>
        m.includes("fonts.googleapis.com") ||
        m.includes("Content Security Policy") ||
        m.includes("violates the following Content-Security-Policy"),
    );
    expect(violations, violations.join("\n")).toHaveLength(0);
  });

  test("QMS page has no missing-table (PGRST20x) errors", async ({ page }) => {
    const messages = collectConsole(page);

    await page.goto("/qms/nc", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const missingTableErrors = messages.filter(
      (m) =>
        m.includes("PGRST204") || m.includes("PGRST205") || m.includes("Could not find the table"),
    );
    expect(missingTableErrors, missingTableErrors.join("\n")).toHaveLength(0);
  });
});
