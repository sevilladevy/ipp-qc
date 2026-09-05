import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

const isVercel = process.env.VERCEL === "1";

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
  ...(isVercel
    ? {
        cloudflare: false,
        plugins: [nitro()],
      }
    : { cloudflare: true }),
  vite: {
    server: {
      watch: {
        ignored: e2eWatchIgnored,
      },
    },
  },
} as Parameters<typeof defineConfig>[0]);
