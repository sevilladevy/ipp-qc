import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

const isVercel = process.env.VERCEL === "1";

export default defineConfig(
  isVercel
    ? {
        cloudflare: false,
        plugins: [nitro()],
      }
    : { cloudflare: true },
);
