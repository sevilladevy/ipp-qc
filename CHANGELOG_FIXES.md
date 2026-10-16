### Fix #1 — Demo auth bypass removal + security hardening: Hardcoded demo123 password and x-demo-user-role backdoor removed from client/server + rate limiting added

| Field | Value |
|---|---|
| **Tanggal** | 2026-10-16 |
| **File** | `src/lib/auth.tsx`, `src/integrations/supabase/auth-middleware.ts`, `src/integrations/supabase/auth-client-middleware.ts`, `src/routes/login.tsx`, `src/server/reports.ts`, `src/server/users.ts`, `vercel.json`, `.gitignore`, `scripts/e2e-smoke.mjs`, `scripts/seed-test-data.mjs` |
| **Masalah** | Demo mode bypass (`x-demo-user-id` / `x-demo-user-role` headers) allowed anyone to impersonate supervisor without credentials. Hardcoded password `demo123` in client bundle. Service-role key used for report writes bypassing RLS. No rate limiting on server. Security headers missing from Vercel. |
| **Akar** | Demo auth was never intended for production; legacy debug code left in place. |
| **Fix** | Removed all demo bypass logic from auth-middleware, auth.tsx, and auth-client-middleware. Replaced service-role client with user client in `reports.ts`. Added server-side rate limiting (`checkServerRateLimit`, `recordServerFailedAttempt`). Updated `vercel.json` with CSP, HSTS, X-Frame-Options. Updated `.gitignore` for runtime report files. Scripts now require env vars. |
| **Verifikasi** | `npm run build` passes. `npm run lint` passes. `npm test` — 43/43 passed. |
| **Pelajaran** | Demo/debug code must be stripped before any production deployment. |
| **Log Keyword** | demo bypass, hardocoded password, service-role, RLS |
| **Deploy** | PENDING verifikasi |

<!-- ENTRI BARU DI BAWAH BARIS INI -->
