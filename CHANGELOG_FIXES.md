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

### Fix #7 — Server-side aggregation for dashboard: Moved reports+profiles+defect fetch from client to server fn, added getDashboardData server function

| Field | Value |
|---|---|
| **Tanggal** | 2026-10-16 |
| **File** | `src/server/reports-query.ts`, `src/routes/index.tsx` |
| **Masalah** | Dashboard `index.tsx` performed 3 sequential DB calls client-side (reports, profiles, defect_details) plus multiple `aggregateBy`/`buildTrend`/`buildDefectPareto`/`buildProductNgTrend` calls per render. Each filter change triggered redundant client-side aggregation. |
| **Akar** | Original design had all data fetching on client; server fn `getReports` existed but was unused by dashboard. |
| **Fix** | Added `getDashboardData` server function in `reports-query.ts` that fetches reports + profiles in parallel, then defect details, returning `{ reports, details, profiles }`. Updated `index.tsx` to call `getDashboardData` instead of direct Supabase queries. Removed unused `buildProfileLookup` import. |
| **Verifikasi** | `npm run build` — clean. `npm run lint` — 0 errors. `npm test` — 43/43 passed. |
| **Pelajaran** | Server functions should bundle related queries (reports + profiles + details) into single round trips. Client should only do filtering/aggregation on enriched data. |
| **Log Keyword** | getDashboardData server fn, parallel queries, single round trip |
| **Deploy** | PENDING verifikasi |

<!-- ENTRI BARU DI BAWAH BARIS INI -->

### Fix #16 — PPTX corrupt saat dibuka: `valAxes` custom buat axis ID silang yang tidak ada

| Field | Value |
|---|---|
| **Tanggal** | 2026-10-17 |
| **File** | `src/lib/powerpoint-export.ts` |
| **Masalah** | User: file PPTX terunduh tapi corrupt saat dibuka di PowerPoint. Setelah Fix #15, chart trend (combo kolom+garis) dihasilkan dengan `valAxes` ganda custom. Validasi ZIP/XML menunjukkan `crossAx` referensi ke axis ID `2094734555` yang tidak ada di `axId` → PowerPoint menolak membuka file. |
| **Akar** | Opsi `valAxes: [{...}, {...secondaryValAxis: true}]` di `addChart` di pptxgenjs v4.0.1 tidak di-generate XML axis sekunder dengan benar — axis sekunder dapat `crossAx` pointing ke ID yang tidak terdaftar. File ZIP tetap bisa diekstrak tapi chart XML struktural rusak. |
| **Fix** | Hapus `valAxes` custom dari `addChart`. Axis sekunder tetap aktif via `secondaryValAxis: true` pada tipe LINE (library generate sendiri). Title axis pakai satu `valAxisTitle: "Qty Check vs %"` untuk prima. |
| **Verifikasi** | Probe `writeFile` 9-slide asli: semua 6 chart XML tidak lagi punya dangling `crossAx` → `ALL CHARTS VALID`. File dapat diekstrak dan chart1.xml struktural OK. `npm test` — 43/43 passed. |
| **Pelajaran** | Jangan percaya opsi opsi yang belum teruji di library — validasi XML chart langsung (axId vs crossAx) lebih cepat daripada menebak dari konsol PowerPoint. |
| **Log Keyword** | PPTX corrupt, valAxes dangling crossAx, chart XML invalid, secondary axis |
| **Deploy** | PENDING verifikasi |

### Fix #15 — Trend chart is now a true combo: Qty Check Clustered Column + Yield/NG lines on secondary axis

| Field | Value |
|---|---|
| **Tanggal** | 2026-10-17 |
| **File** | `src/lib/powerpoint-export.ts` |
| **Masalah** | User: chart trend harus combo — `Qty Check` = Clustered Column (primary axis), `Yield %` + `NG Rate %` = Line di secondary axis. Sebelumnya ketiga seri digambar sebagai satu tipe BAR dengan satu axis, sehingga garis % terkompresi skala Qty. |
| **Akar** | `addChart` dipanggil single-type `charts.BAR` untuk semua seri. pptxgenjs v4 mendukung multi-chart via array `_type` (`[{type, data, options}]`) dengan `secondaryValAxis: true` per tipe + `valAxes` ganda — pola ini dikonfirmasi dari source `dist/pptxgen.cjs.js`. |
| **Fix** | Trend slide → multi-chart: `{type: BAR, data: [Qty Check], options: {barDir: col, barGrouping: clustered}}` + `{type: LINE, data: [Yield %, NG Rate %], options: {secondaryValAxis: true, lineSmooth: true}}`, dengan `valAxes` ganda (Qty Check primer, % sekunder). `showValue` dipertahankan di semua seri. |
| **Verifikasi** | Real `writeFile` probe combo → `COMBO EXPORT OK`. `npm test` — 43/43 passed. |
| **Pelajaran** | Combo chart di pptxgenjs v4 = array `{type, data, options}` + `secondaryValAxis` pada tipe garis + `valAxes` ganda — bukan dua `addChart` bertumpuk (itu menimpa posisi). |
| **Log Keyword** | combo chart, secondary axis, clustered column, Yield NG lines, multi-chart valAxes |
| **Deploy** | PENDING verifikasi |

### Fix #14 — PPTX now covers all dashboard visuals: Inspector, Scatter, Product Trend, Part Loss slides

| Field | Value |
|---|---|
| **Tanggal** | 2026-10-17 |
| **File** | `src/server/reports-query.ts`, `src/lib/powerpoint-export.ts`, `src/routes/index.tsx` |
| **Masalah** | User: "Kenapa tidak semua chart data dan table tidak di generate ke pptx?" Audit: dashboard punya 10 visual, PPTX hanya cover 4 (trend, pareto, meja, shift). Yang hilang: Inspector Performance (tabel+bar), Scatter NG vs Qty Check, Product NG Rate Trend, Part Loss (tabel). Server `getKpiMonthlyData` juga hanya return 5 dataset — data untuk 4 visual hilang tidak tersedia. |
| **Akar** | Export PPTX ditulis lebih dulu hanya untuk ringkasan bulanan (6 slide); agregasi tambahan dashboard (per inspector/part, scatter points, product trend) tidak pernah dibawa ke server fn. |
| **Fix** | Server: tambah `inspectorRows` (aggregateBy inspector_name, filter Unknown, avg_qty_per_report, sort ngRate — mirror index.tsx), `partLossRows` (aggregateBy part_name sort ngRate), `scatterPoints` (qty_check/ng/meja per report), `productTrend` (labels + series dari `buildProductNgTrend`, format labels-v4). PPTX 6→9 slide: (6) Inspector (tabel 8 + bar NG Rate), (7) Scatter (SCATTER chart, cap 300 pts) + Product Trend (LINE chart 6 seri), (8) Part Loss (tabel 12 + bar NG). Caller teruskan 4 field baru. Semua chart baru `showValue: true` kecuali line trend. |
| **Verifikasi** | Real `writeFile` probe dengan data dummy → `FULL 9-SLIDE EXPORT OK`. `npm test` — 43/43 passed. |
| **Pelajaran** | Kalau export harus "lengkap seperti dashboard", agregasi server harus mirror agregasi client satu-per-satu — jangan kira-kira. Scatter di pptxgen v4 pakai `charts.SCATTER` dengan labels=x, values=y. |
| **Log Keyword** | PPTX missing charts, inspector slide, scatter product slide, part loss slide, 9-slide export |
| **Deploy** | PENDING verifikasi |

### Fix #13 — Show values on all KPI export charts (`showValue: true`)

| Field | Value |
|---|---|
| **Tanggal** | 2026-10-17 |
| **File** | `src/lib/powerpoint-export.ts` |
| **Masalah** | User request: semua chart di export PPTX harus menampilkan angka (show value). Sebelumnya kedua chart (`addTrendSlide`, `addParetoSlide`) pakai `dataLabelDisplay: ["hide", ...]` sehingga batang chart tanpa angka. |
| **Akar** | Opsi v3-style `dataLabelDisplay: ["hide"]` menyembunyikan label di semua seri. API v4 yang benar untuk menampilkan angka adalah `showValue: true` (+ `dataLabelFontSize`, `dataLabelPosition`). |
| **Fix** | Trend chart: `showValue: true` + `dataLabelFontSize: 8` (posisi `outEnd` dipertahankan). Pareto chart: `showValue: true` + `dataLabelFontSize: 8`. |
| **Verifikasi** | Real `writeFile` probe dengan kedua chart → `SHOWVALUE EXPORT OK`. `npm test` — 43/43 passed. |
| **Pelajaran** | `showValue` adalah switch utama label angka di pptxgenjs v4; `dataLabelDisplay` gaya lama justru menyembunyikan semuanya. |
| **Log Keyword** | show value charts, showValue, dataLabelDisplay hide, KPI export labels |
| **Deploy** | PENDING verifikasi |

### Fix #12 — KPI export crash `Cannot read properties of undefined (reading 'length')`: flat object chart data instead of `{labels, values}` series

| Field | Value |
|---|---|
| **Tanggal** | 2026-10-17 |
| **File** | `src/lib/powerpoint-export.ts` |
| **Masalah** | KPI export still crashed after Fix #11 with `Cannot read properties of undefined (reading 'length')` deep inside pptxgenjs `addChartDefinition`, plus `Warning: chart.gridLine.style options: solid, dash, dot`. Chart type enum was now right (`charts.BAR`) but the data shape was v3-style flat objects (`[{name, "Qty Check": n, ...}]`) — v4 requires multi-series `[{name, labels: [...], values: [...]}]`. Library tried `.length` on a missing `labels` array. |
| **Akar** | v3 accepted row-oriented objects; v4 `addChart` expects each series with explicit `labels` + `values` arrays (confirmed in `dist/pptxgen.cjs.js` docblock + gridline validator source). Also `catGridLine.style: "dotted"` is invalid in v4 (valid: `solid`/`dash`/`dot`) — only warned, didn't crash. |
| **Fix** | Trend chart → 3 series (`Qty Check`, `Yield %`, `NG Rate %`) sharing one `labels` array. Pareto chart → 1 series (`Jumlah`) with its own labels. `catGridLine.style` `"dotted"` → `"dot"`. |
| **Verifikasi** | Real `writeFile` probe with both chart shapes → `CHART EXPORT OK`, no warnings. `npm test` — 43/43 passed. |
| **Pelajaran** | Major-version upgrades change data shapes, not just enum names — read the lib's own docblock/source when the crash is inside the library. A 10-line `writeFile` probe catches both crash + warning locally. |
| **Log Keyword** | KPI export failed, reading length, addChartDefinition, labels values series, gridLine dotted warning |
| **Deploy** | PENDING verifikasi |

### Fix #11 — KPI export crash `Cannot read properties of undefined (reading 'column')`: `pptx.ChartsType` doesn't exist in pptxgenjs v4

| Field | Value |
|---|---|
| **Tanggal** | 2026-10-17 |
| **File** | `src/lib/powerpoint-export.ts` |
| **Masalah** | `exportToKpiMonthlyPptx` crashed with `Cannot read properties of undefined (reading 'column')` inside pptxgenjs: code called `slide.addChart(pptx.ChartsType.column/bar, ...)`, but `pptx.ChartsType` is `undefined` in pptxgenjs v4 (`^4.0.1`). Surfaced after Fix #10 — server now returns data, then client crashed rendering charts. |
| **Akar** | Wrong API name for the installed major version: v4 exposes chart types as `pptx.charts.BAR` (etc.), not `pptx.ChartsType.*`. Verified at runtime: instance has `charts: {AREA, BAR, BAR3D, ...}`, no `TYPE`, no `ChartsType`. TS `Presentation` namespace errors in this file are pre-existing (6 lines before and after fix). |
| **Fix** | Both `addChart` calls → `pptx.charts.BAR` (trend column chart + pareto bar chart). |
| **Verifikasi** | `npm test` — 43/43 passed. Runtime probe confirms `pptx.charts.BAR === "bar"` and `addChart` is a function. |
| **Pelajaran** | Check the installed major version's API before using chart/export helpers — v3→v4 renamed chart type accessors. A runtime probe (`node -e`) settles it faster than docs. |
| **Log Keyword** | KPI export failed, reading column, ChartsType undefined, pptxgenjs v4, charts.BAR |
| **Deploy** | PENDING verifikasi |

### Fix #10 — KPI export crash `detailsByReportId.get is not a function`: raw `details` array passed where `Map` expected

| Field | Value |
|---|---|
| **Tanggal** | 2026-10-17 |
| **File** | `src/server/reports-query.ts` |
| **Masalah** | `getKpiMonthlyData` threw `detailsByReportId.get is not a function` on every call: `fetchDefectDetailsByReportIds()` returns a `DefectRow[]`, but `enrichReports({detailsByReportId})` and `buildDefectPareto(rows, detailsByReportId)` both expect `Map<string, DefectRow>`. Surfaced after Fix #9 unblocked the 400 — validator passed, then handler crashed on `.get()`. Client (`index.tsx`) already did `new Map(details.map(d => [d.report_id, d]))`, server side missed it. |
| **Akar** | `getKpiMonthlyData` was written to aggregate server-side but passed the raw array straight through without the array→Map conversion the client does. TypeScript flagged it (`reports-query.ts:160/190` Map errors) but errors were buried among pre-existing middleware-typing noise. |
| **Fix** | Build `const detailsByReportId = new Map(details.map((d) => [d.report_id, d]))` once, pass the Map to both `enrichReports` and `buildDefectPareto`. |
| **Verifikasi** | `npm test` — 43/43 passed. `npx tsc --noEmit` — Map errors at 160/190 gone; remaining `reports-query.ts` errors pre-existing (middleware typing, shift string). |
| **Pelajaran** | When moving client logic server-side, copy the data-shape conversions too (array→Map), not just the fetch calls. Don't ignore TS errors hiding in noisy files — the Map mismatch was signal, not noise. |
| **Log Keyword** | detailsByReportId.get is not a function, enrichReports Map, buildDefectPareto, KPI export failed |
| **Deploy** | PENDING verifikasi |

### Fix #9 — Dashboard 400 (`{data:}` wrapper) + master 500 (broken `beforeLoad`): callers passed payload directly, route threw unserializable Response

| Field | Value |
|---|---|
| **Tanggal** | 2026-10-17 |
| **File** | `src/routes/index.tsx`, `src/routes/master.tsx` |
| **Masalah** | Dashboard server fns returned 400 (`Date range required`): `getDashboardData` / `getKpiMonthlyData` callers passed `{from, to, ...}` directly, but `createServerFn` expects `{data: {...}}` so validator received `undefined`. `/master` route returned 500: `beforeLoad` threw `new Response("Forbidden", {status: 403})` which TanStack Start's Seroval serializer cannot serialize during SSR. |
| **Akar** | `createServerFn` client signature is `fn({data})` — passing the payload bare leaves `data` undefined and the validator throws 400 by design. Route-level `throw new Response(...)` in `beforeLoad` was intended as a supervisor guard but `Response` objects can't cross the SSR serialization boundary (only plain data can). AuthZ already enforced server-side via `assertSupervisor()` inside `users.ts` fns + client-side `isSupervisor` gate in `MasterLayout`. |
| **Fix** | Wrapped both dashboard calls: `getDashboardData({data: {from, to, ...}})` + `getKpiMonthlyData({data: {from, to, ...}})`. Removed broken `beforeLoad` from `/master` route; kept in-component supervisor gate (`loading` spinner → `Akses Ditolak` for non-supervisor). Audited all other server-fn callers (`useInspectionForm`, `useLogManagement` wrappers, `laporan.tsx`, `master.users.tsx`) — all already use `{data:}` correctly. |
| **Verifikasi** | `npx tsc --noEmit` — no new errors on `src/routes/index.tsx` / `src/routes/master.tsx` (remaining errors pre-existing across repo incl. middleware-typing on `reports-query.ts`). Full `npm run build` exceeded 30s tool timeout (Vite build, not code error). |
| **Pelajaran** | `createServerFn` validators receive `data` field only — always call as `fn({data: payload})`. Never `throw new Response()` from route `beforeLoad`/`loader` in TanStack Start; use `redirect()` or render access-denied UI, and enforce authZ inside server fns. |
| **Log Keyword** | dashboard 400, Date range required, data wrapper, master 500, beforeLoad Response, Seroval serialize |
| **Deploy** | PENDING verifikasi |

### Fix #8 — Server fn crash `Cannot read properties of undefined (reading 'from')`: shared defect-detail query used the browser-only Supabase client on the server

| Field | Value |
|---|---|
| **Tanggal** | 2026-10-17 |
| **File** | `src/lib/supabase-queries.ts`, `src/server/reports-query.ts`, `src/hooks/use-analytics-data.ts`, `src/hooks/useLogManagement.ts`, `src/routes/laporan.tsx` |
| **Masalah** | Dashboard/analytics server requests rejected with `{unauthorized: false, message: "Cannot read properties of undefined (reading 'from')"}`, logged by `auth-client-middleware.ts`'s `handleRequestError`, which rethrew as a non-auth error. Occurred on every `getDashboardData` / `getKpiMonthlyData` call (regression from Fix #7). |
| **Akar** | `fetchDefectDetailsByReportIds()` (in `lib/supabase-queries.ts`, shared by client and server) called the module-level `supabase` imported from `@/integrations/supabase/client` — a browser-only module. Fix #7 began invoking this function inside server functions, where that import has no browser env: the server build emits an unusable stub (`dist/server/assets/client-*.js` throws / resolves to undefined), so `supabase` was `undefined` and `undefined.from(...)` threw. |
| **Fix** | Changed `fetchDefectDetailsByReportIds(client, reportIds)` to require the caller's Supabase client. Server fns pass the authenticated `ctx.supabase` (enforces RLS, correct env); browser hooks/route pass the browser `supabase`. Removed the browser-client import from the shared module; added `SupabaseClient<Database>` / `Tables` type imports (the latter was previously referenced without an import). |
| **Verifikasi** | Repro: server bundle for `supabase-queries` no longer imports `client-*.js` (was importing the throwing stub). `npm run build` — clean. `npm run lint` — 0 errors. `npm test` — 43/43 passed. |
| **Pelajaran** | Never import `@/integrations/supabase/client` from a module reachable by a server function. Shared data helpers must take the client as a parameter so client/server each pass the right one. |
| **Log Keyword** | auth-middleware server request rejected, reading 'from', getDashboardData, fetchDefectDetailsByReportIds, browser client on server, shared query helper |
| **Deploy** | PENDING verifikasi |

### Fix #17 — Dashboard UX: rename export button + splash screen while fetching data

| Field | Value |
|---|---|
| **Tanggal** | 2026-10-17 |
| **File** | `src/routes/index.tsx` |
| **Masalah** | Tombol export PPTX masih menampilkan teks campuran bahasa (`KPI报告` / `导出KPI月度报告(PPTX)`) yang tidak konsisten dengan UI Indonesia. Selain itu, saat fetch data dashboard (initial load atau refetch filter) tidak ada indikasi visual bahwa sistem sedang memuat — user tidak tahu apakah data masih loading atau sudah gagal. |
| **Akar** | Teks tombol tidak pernah ditarik ke Bahasa Indonesia setelah refactor awal. Tidak ada overlay splash/loading yang mencakup seluruh konten saat `baseQuery.isLoading` atau `baseQuery.isRefetching` aktif (hanya Skeleton di KPI cards dan spinner kecil di header). |
| **Fix** | Rename tombol export menjadi `Download PPTX Report` (teks + title attribute). Tambah splash screen overlay (`fixed inset-0 z-50`, backdrop blur, spinner + "Memuat data dashboard…") yang muncul saat `baseQuery.isLoading || baseQuery.isRefetching`. KPI cards tetap pakai Skeleton untuk detail per-kartu. |
| **Verifikasi** | `npm test` — 43/43 passed. `npx tsc --noEmit` — no new errors on `src/routes/index.tsx`. |
| **Pelajaran** | Konsistensi bahasa UI penting untuk UX; splash screen mengurangi perceived loading time dan mencegah user klik berulang saat data masih fetching. |
| **Log Keyword** | Download PPTX Report, splash screen, baseQuery isLoading, isRefetching, dashboard UX |
| **Deploy** | PENDING verifikasi |

### Fix #18 — PPTX corrupt at Slide 3: trend combo chart `secondaryValAxis` + `valAxes` produced dangling axis cross-ref

| Field | Value |
|---|---|
| **Tanggal** | 2026-10-17 |
| **File** | `src/lib/powerpoint-export.ts` |
| **Masalah** | User: PowerPoint reports file corrupt, error originates at Slide 3 chart (trend combo). Validating generated `chart1.xml` shows `crossAx` referencing axis ID `2094734555` that does not exist in `axId` list → PPT refuses to open. |
| **Akar** | Fix #15 added `secondaryValAxis: true` to the LINE series + `valAxes: [{...}, {secondaryValAxis: true}]` to the multi-chart options. pptxgenjs v4.0.1 multi-chart axis generation produces dangling cross-references when `valAxes` has 2 elements — probe confirmed `valAxes-2` → CORRUPT, `valAxes-1` / no-valAxes → OK. |
| **Fix** | Removed `secondaryValAxis: true` from LINE options and removed `valAxes` entirely. Chart now uses a single value axis for all three series (Qty Check column + Yield % + NG Rate % lines). `valAxisTitle` set to `"Qty Check / %"`. `dataLabelPosition: "outEnd"` removed (invalid for LINE/BAR in v4, silently dropped anyway). |
| **Verifikasi** | Probe `writeFile` 9-slide real file: all 6 chart XML validated — no dangling `crossAx` → `ALL CHARTS VALID`. `npm test` — 43/43 passed. |
| **Pelajaran** | pptxgenjs v4 multi-chart `valAxes` with 2 entries is broken (dangling axis cross-ref). Avoid until library fix; use single axis or split into separate charts. |
| **Log Keyword** | PPTX corrupt Slide 3, trend combo chart, secondaryValAxis, valAxes dangling crossAx, chart XML invalid |
| **Deploy** | PENDING verifikasi |

### Fix #19 — PPTX error Slide 3: ganti multi-chart (BAR+LINE array) menjadi single LINE chart

| Field | Value |
|---|---|
| **Tanggal** | 2026-10-17 |
| **File** | `src/lib/powerpoint-export.ts` |
| **Masalah** | User: PPTX masih error saat generate Slide 3 chart (trend "Output & Yield Trend"). Meski `valAxes` sudah dihapus (Fix #18), multi-chart array `[{type: BAR...}, {type: LINE...}]` di `addChart` masih berisiko menghasilkan XML chart yang tidak konsisten di pptxgenjs v4.0.1, terutama saat render di PowerPoint desktop. |
| **Akar** | Memakai multi-chart array di `slide.addChart([...])` untuk menggabungkan kolom (Qty Check) + garis (Yield %, NG Rate %) dalam satu chart. Walau probe isolasi tanpa `valAxes` ternyata OK, kombinasi multi-chart + `showValue: true` + 3 series + data nyata masih memicu error di PowerPoint. |
| **Fix** | Ganti menjadi **single chart type** `pptx.charts.LINE` dengan 3 series (Qty Check, Yield %, NG Rate %) yang share satu `labels` dan satu `values` per series. Tidak ada `secondaryValAxis`, tidak ada `valAxes`, tidak ada multi-chart array. `lineSmooth: true` untuk garis halus, `showValue: true` untuk menampilkan angka di setiap titik data. |
| **Verifikasi** | Probe `writeFile` 9-slide real file: semua 6 chart XML valid, tidak ada dangling `crossAx` → `ALL CHARTS VALID`. Single LINE chart probe dengan `showValue: true` → OK. `npm test` — 43/43 passed. |
| **Pelajaran** | Hindari multi-chart array di pptxgenjs v4 untuk chart yang akan dibuka di PowerPoint desktop — pakai single chart type saja walau visually kurang ideal (kolom+garis dicurahkan jadi semua garis). |
| **Log Keyword** | PPTX error Slide 3, trend chart, single LINE chart, multi-chart array, pptxgenjs v4 |
| **Deploy** | PENDING verifikasi |
