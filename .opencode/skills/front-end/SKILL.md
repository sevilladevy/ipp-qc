---
name: front-end
description: Use when working on UI components, pages, styling, client-side logic, or any front-end concerns. Trigger keywords: component, UI, page, style, CSS, layout, form, modal, icon.
---

# Front End

Tech stack for this project:
- **React 19** with TypeScript
- **TanStack Router** (file-based routing in `src/routes/`)
- **TanStack Query** (server state management)
- **Vite** (build tool)
- **Tailwind CSS** (utility-first CSS, configured in `tailwind.config.mjs`)
- **Lucide React** (icons)
- **sonner** (toasts)
- **date-fns** (date formatting)
- **Recharts** (charts on dashboard)
- **Playwright** (E2E testing)

## Conventions
- Components use PascalCase filenames, utils use camelCase
- UI primitives in `src/components/ui/`
- Feature components in `src/components/`
- Pages in `src/routes/` (file-based routing)
- Custom hooks in `src/hooks/`
- Formatting utils in `src/lib/format.ts`
- Shared constants in `src/lib/constants.ts`
