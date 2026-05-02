# AskBetter

Better questions, better answers. AskBetter analyzes pasted ChatGPT conversations and returns structured coaching feedback to help you improve your prompting habits.

## Chat Integration

The app includes a live AI coaching chat powered by OpenAI. After analyzing a conversation, a "Chat with your coach" panel appears on the results page so you can ask follow-up questions.

### Setup

**1. Install frontend dependencies**
```bash
npm install
```

**2. Install backend dependencies**
```bash
npm install --prefix server
```

**3. Configure your OpenAI API key**
```bash
cp server/.env.example server/.env
```
Open `server/.env` and add your key:
```
OPENAI_API_KEY=sk-...
```
Get a key at https://platform.openai.com/api-keys

**4. Run the backend server**
```bash
npm run dev:server
# Express server starts on http://localhost:3001
```

**5. Run the frontend**
```bash
npm run dev
# Vite dev server starts on http://localhost:5173
```

The Vite dev server proxies `/api` requests to the Express backend automatically — no CORS configuration needed.

### Architecture

```
Browser (Vite :5173)
  └─ POST /api/chat ──proxy──► Express (:3001)
                                  └─► OpenAI API
```

- API key is stored server-side only — never exposed to the browser
- Full conversation history is sent on every request for multi-turn context
- Retry logic: up to 3 attempts with exponential backoff (1s, 2s, 4s)
- Request timeout: 30 seconds

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
