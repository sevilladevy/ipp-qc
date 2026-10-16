# ipp-quality

Quality inspection (IPP / In-Process Product) management app for mobile-first inspectors and supervisors. Built with **TanStack Start + React** on the front end and **Supabase** on the backend, deployed to **Vercel**.

## Tech Stack

- **Framework:** TanStack Start (React, TanStack Router, TanStack Query)
- **Backend:** Supabase (Postgres + RLS + Auth)
- **UI:** Tailwind CSS v4, Radix UI primitives, shadcn-style components, Recharts
- **Exports:** PDF (jsPDF), Excel (ExcelJS), PowerPoint (PptxGenJS)
- **Deployment:** Vercel

## Project Structure

```
src/
  routes/            # File-based router: login, input, laporan, analitik, master/*
  integrations/
    supabase/
      client.ts           # Supabase browser client
      client.server.ts    # Supabase admin (service-role) client
      auth-middleware.ts  # Server-side auth (requireSupabaseAuth)
      auth-client-middleware.ts  # Attaches Supabase token / demo headers
  lib/                 # Formatting, validation, management helpers
  styles.css           # Global styles incl. mobile card layout (.cardify)
  router.tsx           # Router + QueryClient setup
```

## Roles

- **Inspector** — input inspection results, view my reports.
- **Supervisor** — `master/*` management (users, meja/tables, parts, defect types) via `src/routes/master.ts` guard.

## Demo Mode

Set `VITE_DEMO_MODE=true` to enable the demo login flow with `inspector@demo.com`. Demo/auth headers are gated by this flag on both client and server to prevent stale-session hijacking.

## Auth Flow

- Client attaches `Authorization: Bearer <supabase access token>` to server functions via `attachAuthHeader`.
- Server validates with `requireSupabaseAuth`. On an expired/invalid token it returns `401`; the client middleware detects this, clears the stale session, and redirects to `/login`.

## Getting Started

```bash
# install
npm install

# run dev
npm run dev

# tests
npm run test

# lint (a single file)
npx eslint <file>

# production build
npm run build
```

## Environment Variables

See `.env.example` / `.env` for keys. Required server-side:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (never commit this)

Client-safe:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_DEMO_MODE` (optional)

## Migrations

SQL migrasi dikelola di `supabase/migrations/` dan diterapkan ke project live melalui Supabase dashboard (SQL Editor) atau `supabase db push`. Contoh policy RLS untuk ownership-checked INSERT ada di `supabase/migrations/20260805000000_restore_insert_ownership.sql`.

## Deployment

Auto-deploy dari `main` ke Vercel.
