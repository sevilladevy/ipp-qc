### Fix #3 — Zod migration + DEFECT_COLUMNS unification: Replaced manual validation with zod schemas, unified query column string

| Field | Value |
|---|---|
| **Tanggal** | 2026-10-16 |
| **File** | `src/server/users.ts`, `src/lib/format.ts`, `src/lib/supabase-queries.ts` |
| **Masalah** | `inviteUser` validator used manual regex for email/UUID, password length checks. `DEFECT_COLUMNS` string duplicated in `supabase-queries.ts` (separate from format.ts display array). Manual validation is harder to maintain than declarative schemas. |
| **Akar** | Legacy pattern before zod adoption; duplicate column string was independent of display columns array. |
| **Fix** | Added `inviteUserSchema` (zod: email, password min 8/max 72, fullName min 1/max 100 with transform trim, role enum) and `userIdSchema` (uuid) to `users.ts`. Removed manual regex validation. Exported `DEFECT_COLUMNS_QUERY` from `format.ts` and consumed in `supabase-queries.ts`, removing the duplicated string literal. |
| **Verifikasi** | `npm run build` — clean. `npm run lint` — 0 errors. `npm test` — 43/43 passed. |
| **Pelajaran** | Use zod schemas in validators: single source of truth for types + validation. Query column strings should live near display constants, not be duplicated. |
| **Log Keyword** | zod migration, DEFECT_COLUMNS query, manual validation removal |
| **Deploy** | PENDING verifikasi |

### Fix #2 — Dead code removal + Prisma cleanup + validator migration: Removed unused UI components, prisma packages, and migrated deprecated inputValidator

| Field | Value |
|---|---|
| **Tanggal** | 2026-10-16 |
| **File** | `prisma/`, `prisma.config.ts`, `src/components/ui/carousel.tsx`, `src/components/ui/menubar.tsx`, `src/components/ui/context-menu.tsx`, `src/components/ui/drawer.tsx`, `package.json`, `src/server/reports.ts`, `src/server/users.ts`, `src/server/reports-query.ts` |
| **Masalah** | 4 unused UI components in bundle. Prisma packages (`@prisma/client`, `@prisma/adapter-pg`, `prisma`, `pg`) installed but never used in `src/`. `inputValidator()` deprecated in `@tanstack/react-start` v1.168. `demoMode` field leftover in `ReportContext`. |
| **Akar** | Leftover from earlier stack exploration; Prisma schema diverged from Supabase migrations (has `sessions` table not in DB). |
| **Fix** | Deleted 4 unused UI components. Removed `prisma/` directory and `prisma.config.ts`. Removed prisma/pg packages from `package.json` + `npm install`. Renamed 7x `.inputValidator()` → `.validator()`. Removed `demoMode?: boolean` from `ReportContext`. |
| **Verifikasi** | `npm run build` — no deprecation warnings. `npm run lint` — 0 errors. `npm test` — 43/43 passed. |
| **Pelajaran** | When choosing a stack, remove competing ORM configs early to avoid drift. |
| **Log Keyword** | dead code, prisma removal, inputValidator deprecation, demoMode cleanup |
| **Deploy** | PENDING verifikasi |

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

### Fix #4 — God component decomposition: laporan.tsx → FilterBar+Row+Table, analitik.tsx → hook+tabs

| Field | Value |
|---|---|
| **Tanggal** | 2026-10-16 |
| **File** | `src/routes/laporan.tsx` (968→538 lines), `src/components/laporan/*`, `src/routes/analitik.tsx` (993→260 lines), `src/components/analytics/*`, `src/hooks/use-analytics-data.ts` |
| **Masalah** | Two god components: `laporan.tsx` (968 lines) and `analitik.tsx` (993 lines) made logic reuse and testing impossible. |
| **Akar** | Single-file pattern for complex routes. |
| **Fix** | Decomposed `laporan.tsx` into `LaporanFilterBar`, `LaporanRow`, `LaporanTable` + slim page. Decomposed `analitik.tsx` into `useAnalyticsData` hook + `KpiGrid`, `OverviewCharts`, `MetricsTab`, `DeepDiveTab`, `ScatterNgVsQtyCheck`. Extracted `buildPartPareto` import to AnalyticsHelpers module. |
| **Verifikasi** | `npm run build` — clean. `npm run lint` — 0 errors. `npm test` — 43/43 passed. |
| **Pelajaran** | Keep routes under ~300 lines; extract shared logic to hooks/components early. |
| **Log Keyword** | god component, decomposition, hook extraction |
| **Deploy** | PENDING verifikasi |

### Fix #5 — Dead code cleanup: remove builder.tsx placeholder + cloudflare references

| Field | Value |
|---|---|
| **Tanggal** | 2026-10-16 |
| **File** | `src/routes/builder.tsx`, `package.json`, `vite.config.ts` |
| **Masalah** | `builder.tsx` adalah placeholder kosong (44 baris) yang tidak dipakai. `@cloudflare/vite-plugin` di-instal tapi tidak dipakai — deploy target adalah Vercel. |
| **Akar** | Leftover dari setup awal yang explore multiple deploy targets. |
| **Fix** | Hapus `src/routes/builder.tsx`. Hapus `@cloudflare/vite-plugin` dari `package.json`. Hapus `cloudflare: false` dari `vite.config.ts`. |
| **Verifikasi** | `npm run build` — clean. `npm run lint` — 0 errors. `npm test` — 43/43 passed. |
| **Pelajaran** | Hapus package/deps yang tidak dipakai saat memilih stack final. |
| **Log Keyword** | dead code, cloudflare removal, builder placeholder |
| **Deploy** | PENDING verifikasi |

### Fix #6 — Report type unification + jam_mulai/jam_selesai bug fix: Unified REPORT_COLUMNS with DB schema, fixed undefined time fields in InputLogRow

| Field | Value |
|---|---|
| **Tanggal** | 2026-10-16 |
| **File** | `src/lib/supabase-queries.ts`, `src/lib/management.ts`, `src/hooks/useLogManagement.ts` |
| **Masalah** | `REPORT_COLUMNS` string in `supabase-queries.ts` lacked `jam_mulai` and `jam_selesai` columns, while `InputLogRow` (in `useLogManagement.ts`) expected them via the loose `{ lot_no?: ... }` style type. `ReportRow` in `management.ts` also missing these two fields. Divergent types caused `jam_mulai`/`jam_selesai` always `undefined` in input log view. |
| **Akar** | `REPORT_COLUMNS` was created before time fields were added to the form; `ReportRow` type was written independently and never re-synced. `InputLogRow` used a loose ad-hoc type instead of extending `ReportRow`. |
| **Fix** | Added `jam_mulai: string` and `jam_selesai: string` to `REPORT_COLUMNS` string literal. Added both fields to `ReportRow` type in `management.ts`. Changed `InputLogRow` to `export type InputLogRow = ReportRow & { ... }` so it inherits the unified fields automatically. Also added `buildReportQueryFilters` helper to `supabase-queries.ts` for future server-side filtering. |
| **Verifikasi** | `npm run build` — clean. `npm run lint` — 0 errors. `npm test` — 43/43 passed. |
| **Pelajaran** | When a query column string grows new columns, update both the SQL projection AND the corresponding TypeScript type in lockstep. Prefer extending a base type over defining duplicate loose fields. |
| **Log Keyword** | jam_mulai undefined, jam_selesai undefined, InputLogRow type divergent, ReportRow sync |
| **Deploy** | PENDING verifikasi |

<!-- ENTRI BARU DI BAWAH BARIS INI -->
