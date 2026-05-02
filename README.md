# AskBetter

Devpost Link: https://kiro-hacks-cal-poly.devpost.com/?_gl=1*1be4uwu*_gcl_au*MTYxMjE5OTc4OS4xNzc2ODA4NjUw*_ga*MTUzNDQ3ODQ4OS4xNzc2ODA4NjUw*_ga_0YHJK3Y10M*czE3Nzc3NDIyOTckbzUkZzAkdDE3Nzc3NDIyOTckajYwJGwwJGgw

## Local Development

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create `server/.env`:

```bash
GROQ_API_KEY=your_groq_api_key
# optional existing server vars:
# SUPABASE_URL=...
# SUPABASE_ANON_KEY=...
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

## Routes

- `/` analyzer input workflow (unchanged)
- `/results` analyzer results workflow (unchanged)
- Live chat is embedded in `/results` (server-side Groq streaming)

## Chat API Contract

`POST /api/chat/stream`

Body:

```json
{
  "messages": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi there" }
  ]
}
```

Roles must be `"user"` or `"assistant"`. Responses stream as `text/event-stream` with `token`, `end`, and `error` events.
