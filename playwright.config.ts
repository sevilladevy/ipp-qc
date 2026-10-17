import { defineConfig, devices } from "@playwright/test";

// Dev server port — must match vite.config.ts (DEV_PORT). Unique, outside the
// 8080-8089 range to avoid clashing with other local services.
const PORT = Number(process.env.E2E_PORT ?? process.env.VITE_DEV_PORT ?? 4713);
const BASE_URL = process.env.E2E_BASE_URL || `http://127.0.0.1:${PORT}`;

// Specs read process.env.E2E_BASE_URL at module load; set it here so they all
// agree with the configured port without repeating the literal in every file.
process.env.E2E_BASE_URL ??= BASE_URL;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { outputFolder: "reports/playwright" }],
    ["json", { outputFile: "reports/playwright/results.json" }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Smaller viewports run the main flows; admin-heavy specs
      // (auth, users, e2e) stay desktop-only.
      name: "Tablet",
      testMatch: /(input|laporan|master-data|dashboard|analytics)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: "Mobile",
      testMatch: /(input|laporan|master-data|dashboard|analytics)\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: `npm run dev -- --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
