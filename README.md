# AskBetter

**Better questions, better answers.**

🔗 [Live App](https://ask-better-kiro-hacks.vercel.app/) · [Devpost](https://kiro-hacks-cal-poly.devpost.com/)

**Demo Login:** `eschiffler1122@gmail.com` / `Testing1!`

## What is AskBetter?

AskBetter is a web app that analyzes your AI conversations and helps you understand how you interact with tools like ChatGPT, Gemini, and Perplexity. Paste a share link from any supported platform, and AskBetter will break down your prompting habits — showing where you were passive, where you were active, and how to ask better questions.

### What it does

- **Analyzes your prompts** — classifies each message by intent (delegation, curiosity, collaborative, verification) and scores quality across six dimensions
- **Scores your conversation** — rates Autonomy, Curiosity, Critical Thinking, Specificity, Context, and Engagement on a 0–100 scale
- **Detects patterns** — identifies behavioral patterns like one-and-done prompts, rubber-stamping, or fading engagement
- **Gives actionable feedback** — provides concrete, prompt-specific suggestions for improvement, not generic advice
- **Tracks progress over time** — logged-in users get a personal dashboard with trend charts, score comparisons, and platform usage breakdown
- **Supports multiple AI platforms** — works with ChatGPT, Gemini, and Perplexity share links

### How it works

All analysis runs client-side using a rule-based TypeScript engine — no API keys required for analysis. Share links are fetched through a lightweight proxy server that handles CORS restrictions.

## Local Development

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create `server/.env`:

```bash
GROQ_API_KEY=your_groq_api_key
# optional:
# SUPABASE_URL=...
# SUPABASE_ANON_KEY=...
# CHROMIUM_PATH=/path/to/chromium  (for Puppeteer fallback)
```

Optional frontend override in `askbetter/.env.local`:

```bash
VITE_PROXY_URL=http://localhost:3001
```

If `VITE_PROXY_URL` is not set, frontend defaults to `http://localhost:3001`.

### 3) Run server and frontend

Run both:

```bash
npm run dev
```

Or separately:

```bash
npm run start --prefix server
npm run dev --prefix askbetter
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Recharts
- **Backend**: Express proxy server (Node.js) for share link fetching
- **Database**: Supabase (PostgreSQL) for user auth and analysis history
- **Analysis**: Client-side rule-based engine (no LLM required)
- **AI Chat**: Groq API (Llama 3.1) for the embedded chat feature

## Routes

| Route        | Description                                 |
| ------------ | ------------------------------------------- |
| `/`          | Home page with share link input             |
| `/analyze`   | Analysis workflow                           |
| `/results`   | Full analysis display with embedded AI chat |
| `/dashboard` | Personal progress tracking (requires login) |
| `/auth`      | Sign up / Sign in                           |
| `/chat`      | AI chat page                                |

## Built at Kiro Hacks @ Cal Poly

## License

[MIT](LICENSE)
