# AUDIT SISTEMALIP QMS (ipp-quality)

**Tanggal:** 2026-10-16 | **Auditor:** opencode | **Status:** REVIEWED

---

## RINGKASAN EKSEKUTIF

Aplikasi IPP-QC (In-Process Product Quality Control) menggunakan TanStack Start + React di frontend, Supabase (Postgres + RLS + Auth) di backend, dan di-deploy ke Vercel. Setelah audit menyeluruh terhadap keamanan, kode, database, dan infrastruktur, ditemukan **1 issue Critical, 7 High, 5 Medium, 4 Low** yang memerlukan perhatian.

**Tingkat Kesiapan Produksi:** ⚠️ **PERLU PERBAIKAN SEBELUM PRODUCTION**

---

## 1. KEAMANAN (Security)

### 🔴 CRITICAL — Demo Mode Bypass Authentication

**Lokasi:** `src/integrations/supabase/auth-middleware.ts:21-31`

Header `x-demo-user-id` dan `x-demo-user-role` yang bisa ditempa menjadi identitas siapapun. Jika `VITE_DEMO_MODE=true` di build production, penyerang tanpa kredensial cukup kirim:

```
x-demo-user-id: apa-saja
x-demo-user-role: supervisor
```

**Dampak:** Backdoor autentikasi penuh — akses supervisor tanpa password.

**Fix:** Hapus trust-header demo dari build prod (`import.meta.env.PROD` guard) atau validasi dengan signed token server-side (HMAC).

---

### 🟠 HIGH — Password Demo Hard-coded di Client Bundle

**Lokasi:** `src/lib/auth.tsx:18-20,299-300`

```ts
const DEMO_USERS = { "inspector@demo.com": { password: "demo123", ... } };
```

Siapapun yang unduh JS production bisa `grep demo123`.

**Fix:** Pindahkan demo login ke server-side (server cek password via env, terbitkan session HttpOnly), atau hapus total di prod.

---

### 🟠 HIGH — Rate Limiting Client-side Saja

**Lokasi:** `src/lib/rate-limit.ts:17,24-25` + `src/lib/auth.tsx:288-296`

Rate limit hanya in-memory di browser (per-tab/per-reload). Grep `checkRateLimit` di `src/server/*.ts` = **nol hasil**. Penyerang bisa rotasi email/IP untuk brute-force.

**Fix:** Pindahkan ke server (di dalam `requireSupabaseAuth` atau tiap server fn login).

---

### 🟠 HIGH — Service Role Bypass RLS

**Lokasi:** `src/server/reports.ts:55,243`, `src/server/users.ts:173,183`

```ts
const db = getSupabaseAdminClientOrNull() ?? ctx.supabase;
```

Write operasi (save/delete inspection report) selalu pilih admin client bila tersedia. RLS policy `auth.uid() = created_by` jadi dekorasi.

**Fix:** Tulis sebagai user (`ctx.supabase`) agar RLS ditegakkan. Service role hanya untuk auth admin operations.

---

### 🟠 HIGH — Validasi Input Tanpa Zod

**Lokasi:** `src/server/users.ts:151-164`, `src/server/reports.ts:35-44,178-189`

```ts
if (!input.email?.includes("@")) throw ...
if (input.password.length < 6) throw ...
```

Email `a@` lolos, password tanpa batas max (DoS bcrypt), `defects: Record<string, number>` tidak divalidasi.

**Fix:** Gunakan zod schema: `email().email()`, `password().min(12).max(72)`, `userId().uuid()`, `qtyCheck().int().positive()`.

---

### 🟡 MEDIUM — Token di localStorage

**Lokasi:** `src/integrations/supabase/client.ts:22-28`

JWT persisten di `localStorage` rentan eksfiltrasi XSS. Default harusnya `sessionStorage`.

**Fix:** Default `sessionStorage`, `localStorage` hanya bila "remember me" + pertimbangkan cookie `httpOnly`.

---

### 🟡 MEDIUM — RLS Policy Terlalu Longgar

| Migrasi                             | Policy                                      | Masalah                                              |
| ----------------------------------- | ------------------------------------------- | ---------------------------------------------------- |
| `20260715000000` + `20260906000000` | `profiles SELECT USING (true)`              | Semua user bisa enumerasi email/nama/role semua akun |
| `20260716000000`                    | `audit_log INSERT WITH CHECK (true)`        | User mana pun bisa spoof audit trail                 |
| `20260909000000`                    | `non_conformities INSERT WITH CHECK (true)` | Tidak cek `created_by = auth.uid()`                  |

**Fix:** Persempit SELECT ke view non-sensitif, tambah `WITH CHECK (auth.uid() = created_by)`.

---

### 🟡 MEDIUM — Guard Supervisor Hanya di Client

**Lokasi:** `src/routes/master.tsx:44,64`

```ts
if (!isSupervisor) return <Akses Ditolak/>
```

Hanya UX. Untungnya server fn dijaga `assertSupervisor()`, tapi pola ini rapuh.

**Fix:** Tambah route guard server-side (`beforeLoad`).

---

### 🟡 MEDIUM — Tidak Ada Security Headers

**Lokasi:** `vercel.json`, `vite.config.ts`

Tanpa HSTS, `X-Frame-Options`, CSP, `X-Content-Type-Options`.

**Fix:** Tambah headers di `vercel.json`.

---

### 🟢 LOW — VITE_ADMIN_EMAIL Exposure

**Lokasi:** `src/lib/auth.tsx:13`

Email admin ikut bundle browser.

**Fix:** Pindahkan allowlist admin ke tabel DB/server env.

---

## 2. KUALITAS KODE & ARSITEKTUR

### 💥 God Components (>600 baris)

| Route                      | Baris | useState/useMemo |
| -------------------------- | ----- | ---------------- |
| `src/routes/input.tsx`     | 1157  | 5/4/3            |
| `src/routes/qms.audit.tsx` | 1009  | 21/4/4           |
| `src/routes/analitik.tsx`  | 993   | 5/19/2           |
| `src/routes/laporan.tsx`   | 968   | 13/10/3          |
| `src/routes/index.tsx`     | 948   | 3/23/2           |

**Fix:** Ekstrak ke hook + komponen terpisah (pola seperti `input.tsx` → `useInspectionForm` + `components/input/*`).

---

### 📊 Client-side Filtering & Agregasi

**Lokasi:** `lib/management.ts:126`, `routes/index.tsx:196`, `routes/laporan.tsx:163`

Filter rentang tanggal tidak dikirim sebagai `.gte/.lte` ke Supabase — semua data unduh dulu, filter di browser. Agregasi berat (`aggregateBy` dipanggil 3-7x per render).

**Fix:** Buat server fn `getReports(from, to)` dengan validasi `sanitizeDateRange`, pindahkan agregasi ke server/RPC.

---

### 🔁 Duplikasi Query & Tipe

- `DEFECT_COLUMNS` didefinisikan 3x (`supabase-queries.ts`, `format.ts`, `management.ts`)
- 3 tipe report divergen: `ReportSummary`, `ReportRow`, `InputLogRow`
- `REPORT_COLUMNS` tidak ada `jam_mulai/jam_selesai` tapi `InputLogRow` butuh (bug diam: field selalu `undefined`)

**Fix:** Satu sumber kebenaran: turunkan semua dari `ReportBase` di `lib/management.ts`.

---

### 🗑️ Dead Code

- `routes/builder.tsx` — placeholder kosong (44 baris)
- `components/ui/carousel.tsx`, `menubar.tsx`, `context-menu.tsx`, `drawer.tsx` — kemungkinan tidak dipakai
- `demoMode` di `server/users.ts:22` — jalur demo tanpa caller terlihat

---

## 3. DATABASE & MIGRASI

### 🔴 CRITICAL — Dual ORM Tidak Sinkron

**Lokasi:** `prisma/schema.prisma:58-69`, `src/integrations/supabase/types.ts`

Prisma mendefinisikan tabel `sessions` yang **tidak ada** di Supabase migrations. `types.ts` tidak memuat `sessions`. Package `@prisma/client` ada tapi README bilang Supabase.

**Fix:** Putuskan satu stack. Jika Supabase → hapus `prisma/`, `@prisma/client`, `pg`, `prisma.config.ts`.

---

### 🟠 HIGH — Schema Drift

| Tabel                         | Migrasi Lama          | Migrasi Baru                     | Prisma                          |
| ----------------------------- | --------------------- | -------------------------------- | ------------------------------- |
| `defect_types.id`             | `SERIAL`              | `UUID DEFAULT gen_random_uuid()` | `Int @default(autoincrement())` |
| `inspection_reports.total_ok` | `GENERATED ALWAYS AS` | —                                | `Int?` (nullable)               |

**Fix:** Buat migrasi koreksi, pastikan konsistensi.

---

### 🟡 MEDIUM — Missing Index

Foreign key `inspection_reports.created_by`, `audit_schedules.lead_auditor` tidak ada index.

**Fix:** Tambah index pada FK columns.

---

### 🟡 MEDIUM — Seed Data Ganda

`20260714010000_fix_missing_tables.sql:46-85` dan `20260714020000_seed_data.sql:1-79` melakukan seed identik.

**Fix:** Gabung jadi satu migrasi idempotent.

---

## 4. TESTING, BUILD & DEPLOY

### 🟠 HIGH — Script E2E Rusak

**Lokasi:** `scripts/seed-e2e-fixture.mjs:60-90`

Sintaks error — kode function body terbawa keluar fungsi.

**Fix:** Perbaiki struktur fungsi.

---

### 🟠 HIGH — Inkonsistensi Platform Deploy

| Konfigurasi                       | Platform   | Status                     |
| --------------------------------- | ---------- | -------------------------- |
| `vite.config.ts:24`               | Cloudflare | Default `cloudflare: true` |
| `vercel.json`                     | Vercel     | Deploy target Vercel       |
| `.github/workflows/e2e-smoke.yml` | CI         | Tidak set `VERCEL=1`       |

**Fix:** Putuskan satu platform. Jika Vercel → hapus `@cloudflare/vite-plugin`, default `cloudflare: false`.

---

### 🟡 MEDIUM — CI Tidak Lengkap

Hanya ada workflow `e2e-smoke.yml`. Tidak ada build, lint, atau unit test di CI.

**Fix:** Tambah workflow untuk `npm run build`, `npm run lint`, `npm run test`.

---

### 🟡 MEDIUM — Hardcoded Credentials di Script

**Lokasi:**

- `scripts/seed-test-data.mjs:6` — `SUPABASE_URL` hardcoded
- `scripts/e2e-smoke.mjs:7` — `E2E_PASSWORD = "admin@123"`

**Fix:** Pindahkan ke `.env` + `.env.example`.

---

### 🟢 LOW — File Runtime Di-commit

**Lokasi:** `reports/csv-validation-issues.csv`, `reports/e2e-debug-after-login.png`, `reports/e2e-smoke-summary.json`

**Fix:** Tambah ke `.gitignore`.

---

## 5. REKOMENDASI PRIORITAS

### 🔥 P0 — Selesaikan Sebelum Production

1. **Hapus/Mask demo mode di prod** (Critical #1)
2. **Pindahkan rate limit ke server** (High #3)
3. **Lepas service role dari report write** (High #4)
4. **Ganti validasi manual dengan zod** (High #5)
5. **Perbaiki script e2e rusak** (High Build)
6. **Putuskan platform deploy** Vercel vs Cloudflare

### ⚡ P1 — Perbaikan Mendatang

1. **Hapus dual ORM** (hapus Prisma jika tidak dipakai)
2. **Ketates RLS policies** (`profiles`, `audit_log`, `non_conformities`)
3. **Pecah god components** (>600 baris)
4. **Pindahkan agregasi ke server** (client-side filter → server fn)
5. **Tambah security headers** (CSP, HSTS)
6. **Hapus dead code** (builder.tsx, unused UI components)

### 📋 P2 — Refactor & Maintainability

1. **Unifikasi tipe & konstanta** (DEFECT_COLUMNS, Report types)
2. **Tambah CI lengkap** (build, lint, unit test)
3. **Perbaiki index missing** pada FK columns
4. **Default sessionStorage** untuk auth token
5. **Bersihkan file runtime** dari git

---

## LAMPIRAN: File Penting Audit

| Area             | File Kunci                                              |
| ---------------- | ------------------------------------------------------- |
| Auth Middleware  | `src/integrations/supabase/auth-middleware.ts`          |
| Client Auth      | `src/lib/auth.tsx`                                      |
| Server Functions | `src/server/reports.ts`, `src/server/users.ts`          |
| RLS Policies     | `supabase/migrations/*.sql`                             |
| Database Types   | `src/integrations/supabase/types.ts`                    |
| Prisma Schema    | `prisma/schema.prisma`                                  |
| Build Config     | `vite.config.ts`, `vercel.json`                         |
| CI               | `.github/workflows/e2e-smoke.yml`                       |
| E2E Scripts      | `scripts/seed-e2e-fixture.mjs`, `scripts/e2e-smoke.mjs` |
| Tests            | `tests/*.spec.ts`, `src/lib/__tests__/*.test.ts`        |

---

**Status Audit:** ✅ LENGKAP
**Action Required:** 🔴 Ya — Perbaikan P0 harus dilakukan sebelum production launch.
