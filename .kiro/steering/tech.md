# Tech Stack

## Runtime & Framework
- **React 19** with **TypeScript ~6**
- **Vite 8** as build tool and dev server
- **React Router v7** for client-side routing (two routes: `/` and `/results`)

## Styling
- **Tailwind CSS v4** (via `@tailwindcss/vite` plugin — no `tailwind.config.js` needed)
- **clsx** + **tailwind-merge** for conditional class composition
- **lucide-react** for icons

## Charts
- **Recharts v3** for the prompt type distribution chart

## No Backend
- All analysis runs client-side in TypeScript modules under `src/lib/`
- No API keys, no server, no database
- Results are passed between pages via React Router `location.state`

## Common Commands

```bash
# Install dependencies
cd askbetter && npm install

# Start dev server
npm run dev

# Type-check + production build
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

## Key Conventions
- No test framework is currently configured — Vitest is planned but not yet set up
- No shadcn/ui or Zod despite being in the PRD — the current stack uses plain Tailwind + custom components
- Tailwind v4 uses CSS-first config; avoid adding a `tailwind.config.js` unless necessary
