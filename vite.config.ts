import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

// Deploy target: Vercel.
const isVercel = process.env.VERCEL === "1";

// Dev server port. The @lovable.dev config defaults to 8080; this project pins
// a unique port (outside the 8080-8089 range) to avoid colliding with other
// local services. Override with VITE_DEV_PORT or PORT when needed.
// Keep this in sync with playwright.config.ts (E2E_PORT).
const DEV_PORT = Number(process.env.VITE_DEV_PORT ?? process.env.PORT ?? 4713);

// Test artifacts (screenshots, reports, logs, specs) change constantly
// during E2E runs and must never trigger HMR full-reloads, otherwise
// parallel workers destroy each other's pages mid-test.
const e2eWatchIgnored = [
  "**/test-results/**",
  "**/reports/**",
  "**/tests/**",
  "**/*.log",
  "**/.opencode/**",
];

export default defineConfig({
  ...(isVercel ? { plugins: [nitro()] } : {}),
  vite: {
    server: {
      port: DEV_PORT,
      strictPort: true,
      watch: {
        ignored: e2eWatchIgnored,
      },
    },
  },
} as Parameters<typeof defineConfig>[0]);
