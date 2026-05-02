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

## Analysis Engine

- All analysis logic runs client-side in TypeScript modules under `src/analysis/`
- No API keys, no database
- Results are passed between pages via React Router `location.state`

## Proxy Server (Share Link Feature)

- A small Express server lives in `server/` (Node.js, CommonJS)
- Proxies ChatGPT share link fetches server-side to bypass browser CORS restrictions
- Security: only allows HTTPS requests to `chatgpt.com` and `chat.openai.com` with `/share/` paths
- Runs on port `3001` by default
- Frontend calls it at `http://localhost:3001/api/fetch-share?url=<encoded>`
- Configure a different base URL via the `VITE_PROXY_URL` env variable

## Common Commands

```bash
# Install frontend dependencies (run from askbetter/)
npm install

# Start frontend dev server (run from askbetter/)
npm run dev

# Install server dependencies (run from server/)
npm install

# Start proxy server (run from server/)
npm start

# Type-check + production build (run from askbetter/)
npm run build

# Preview production build (run from askbetter/)
npm run preview

# Lint (run from askbetter/)
npm run lint
```

## Key Conventions

- No test framework is currently configured — Vitest is planned but not yet set up
- No shadcn/ui or Zod — the current stack uses plain Tailwind + custom components
- Tailwind v4 uses CSS-first config (`@import "tailwindcss"` in index.css); avoid adding a `tailwind.config.js`
- Analysis engine lives in `src/analysis/` — keep it free of React imports
- Sample conversations for demo live in `src/lib/sampleData.ts`
