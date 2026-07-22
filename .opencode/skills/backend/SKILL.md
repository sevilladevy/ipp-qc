---
name: backend
description: Use when working on server-side logic, API endpoints, database queries, migrations, or Supabase configuration. Trigger keywords: server, API, endpoint, database, migration, Supabase, RLS, server function, middleware.
---

# Backend

Tech stack for this project:
- **TanStack Start** (server functions in `src/server/`)
- **Supabase** (PostgreSQL database, auth, storage)
- **Supabase JS** client (`@supabase/supabase-js`)
- **PostgreSQL** with Row Level Security (RLS)

## Conventions
- Server functions in `src/server/` using `createServerFn`
- Auth middleware in `src/integrations/supabase/`
- Database migrations in `supabase/migrations/`
- Service role client in `src/integrations/supabase/client.server.ts`

## Supabase
- Project URL: `https://ohnvjdzonmzybfqryrau.supabase.co`
- Tables: `inspection_reports`, `inspection_defect_details`, `profiles`, `user_roles`, `inspection_tables`, `parts`, `defect_types`
- Auth: Supabase Auth with email/password; demo mode bypass in `src/lib/auth.tsx`
- RLS: Most tables have RLS enabled with policies for authenticated users and supervisor roles

## Migrations
- Migrations are SQL files in `supabase/migrations/YYYYMMDDHHmmss_description.sql`
- Applied via `supabase db push`
