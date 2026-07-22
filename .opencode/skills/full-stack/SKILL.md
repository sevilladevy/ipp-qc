---
name: full-stack
description: Use for end-to-end features that span both front-end and back-end, or when the task touches multiple layers. Trigger keywords: feature, end-to-end, full stack, integration, deploy, build, smoke test, E2E.
---

# Full Stack

This project is a Quality Inspection Daily Report system built with:

## Stack Overview
- **Frontend**: React 19 + TypeScript + TanStack Router + TanStack Query + Tailwind CSS + Vite
- **Backend**: TanStack Start server functions + Supabase (PostgreSQL, Auth, RLS)
- **Deployment**: Vercel (production at `https://ipp-quality.vercel.app`)
- **Testing**: Playwright for E2E smoke tests

## Common Workflows
1. **Deploy**: `npm run build` → `npx vercel deploy --prebuilt --prod --yes`
2. **Smoke test**: Run Playwright test against production after deploy
3. **DB migration**: Add `.sql` file to `supabase/migrations/` → `supabase db push`
4. **Git**: Commit → push to `main` (auto-deploys if configured)

## Key Source Paths
| Layer | Path |
|-------|------|
| Routes | `src/routes/` |
| Server functions | `src/server/` |
| UI components | `src/components/` |
| Hooks | `src/hooks/` |
| Auth | `src/lib/auth.tsx` |
| Supabase client | `src/integrations/supabase/` |
| Migrations | `supabase/migrations/` |
