# Implementation Plan: LLM Chat Integration

## Overview

Build a backend Express server from scratch and add a chat panel to the existing ResultsPage. The backend proxies requests to OpenAI, securing the API key server-side. The frontend chat UI is embedded below the analysis results — no new route is created.

## Tasks

- [x] 1. Set up backend server scaffold
  - Create `server/` directory with its own `package.json` for Express, cors, dotenv, openai, tsx, vitest, and TypeScript types
  - Create `server/tsconfig.json` targeting Node with `moduleResolution: bundler` and `outDir: dist`
  - Create `server/.env.example` with placeholder values for `OPENAI_API_KEY`, `PORT`, `CORS_ORIGIN`, `OPENAI_MODEL`, `OPENAI_TIMEOUT`, `MAX_RETRIES`, `RETRY_BASE_DELAY`
  - Add `server/.env` to root `.gitignore`
  - Add `dev:server` and `build:server` scripts to root `package.json` for convenience
  - _Requirements: 8.1, 8.4, 5.1, 5.2_

- [x] 2. Implement backend utilities
  - [x] 2.1 Create `server/utils/logger.ts`
    - Implement `LogEntry` interface with `timestamp`, `level`, `requestId`, `message`, `context`
    - Implement `log(level, requestId, message, context?)` function writing JSON to stdout
    - Implement `sanitizeForLogging` to redact keys matching `apiKey`, `api_key`, `authorization`, `token`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 2.2 Create `server/utils/retry.ts`
    - Implement `RetryConfig` interface (`maxRetries`, `baseDelay`, `timeout`)
    - Implement `isRetryable(error)` — returns true for ETIMEDOUT, ECONNRESET, status 429, status 5xx
    - Implement `withRetry<T>(operation, config)` with exponential backoff: delay = `baseDelay * 2^attempt`
    - Export default config: maxRetries=3, baseDelay=1000ms
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 2.3 Write unit tests for retry logic (`server/utils/retry.test.ts`)
    - Test: successful operation on first attempt returns result
    - Test: retryable error retries up to maxRetries and then throws
    - Test: non-retryable error fails immediately without retrying
    - Test: backoff delays follow the 1s → 2s → 4s sequence (mock `sleep`)
    - _Requirements: 4.2, 4.3_

- [x] 3. Implement custom error classes and validation
  - Create `server/errors.ts` with `ValidationError` and `OpenAIError` classes
  - `OpenAIError` carries `statusCode`, `userMessage`, and optional `code`
  - Create `server/validation.ts` with `validateChatRequest(body)` — validates messages array, each message has valid `role` and non-empty `content`; throws `ValidationError` on failure
  - _Requirements: 8.6, 4.4, 10.6_

  - [ ]* 3.1 Write unit tests for validation (`server/validation.test.ts`)
    - Test: valid request passes through unchanged
    - Test: missing messages field returns ValidationError
    - Test: empty messages array returns ValidationError
    - Test: message with invalid role returns ValidationError
    - Test: message with empty content returns ValidationError
    - _Requirements: 8.6_

- [x] 4. Implement OpenAI service
  - Create `server/services/openaiService.ts`
  - Initialize `OpenAI` client from `openai` package using `OPENAI_API_KEY` env var; throw on missing key
  - Implement `createChatCompletion(messages: Message[]): Promise<string>` using `openai.chat.completions.create`
  - Use `gpt-4o-mini` as default model (overridable via `OPENAI_MODEL` env var)
  - Wrap the API call with `AbortController` for the 30-second timeout
  - Map OpenAI SDK errors to `OpenAIError` instances per the error table in the design
  - Wrap the whole call with `withRetry` from `server/utils/retry.ts`
  - _Requirements: 10.1, 10.2, 10.3, 10.5, 4.1, 4.5, 4.6, 5.1, 5.5_

  - [ ]* 4.1 Write unit tests for OpenAI service (`server/services/openaiService.test.ts`)
    - Mock the `openai` SDK client
    - Test: successful completion returns the assistant content string
    - Test: authentication error maps to `OpenAIError` with status 500
    - Test: rate limit error maps to `OpenAIError` with status 429 and specific message
    - Test: AbortError maps to `OpenAIError` with status 504
    - Test: retryable 5xx error triggers retry via `withRetry`
    - _Requirements: 10.6, 4.6_

- [x] 5. Implement Express server and chat route
  - Create `server/handlers/chatHandler.ts` — calls `validateChatRequest`, calls `openaiService.createChatCompletion`, returns `{ message: { role: 'assistant', content } }`; logs request start, success, and failure with a generated `requestId`
  - Create `server/routes/chat.ts` — defines `POST /api/chat`, delegates to `chatHandler`, passes errors to `next()`
  - Create `server/index.ts` — initializes Express, adds `cors` middleware (origin from `CORS_ORIGIN` env, default `http://localhost:5173`), adds `express.json()`, mounts the chat router at `/api`, adds global error-handling middleware that maps `ValidationError` → 400, `OpenAIError` → its `statusCode`, unknown → 500
  - Add `dev` script to `server/package.json`: `tsx watch index.ts`
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 1.4, 1.5, 5.6, 6.1, 6.2_

  - [ ]* 5.1 Write unit tests for chat handler (`server/handlers/chatHandler.test.ts`)
    - Mock `openaiService`
    - Test: valid request returns 200 with `{ message: { role: 'assistant', content } }`
    - Test: empty messages array returns 400
    - Test: invalid message structure returns 400
    - Test: OpenAI service error propagates correct HTTP status
    - _Requirements: 8.2, 8.3, 8.6_

- [x] 6. Checkpoint — backend smoke test
  - Ensure all backend unit tests pass: `cd server && npx vitest run`
  - Manually start the server (`npx tsx index.ts`) and confirm it starts without errors
  - Ask the user if any questions arise before proceeding to frontend work.

- [x] 7. Configure Vite proxy for development
  - In `vite.config.ts`, add a `server.proxy` entry forwarding `/api` to `http://localhost:3001`
  - This allows the frontend dev server to reach the backend without CORS issues during development
  - _Requirements: 8.5, 1.3_

- [x] 8. Create shared Message type
  - Add a `Message` interface (`role: 'system' | 'user' | 'assistant'`, `content: string`) to `src/lib/types.ts` so it can be imported by both the chat hook and components
  - _Requirements: 1.2, 7.1_

- [x] 9. Implement `useChatApi` hook
  - Create `src/hooks/useChatApi.ts`
  - State: `messages: Message[]`, `isLoading: boolean`, `error: string | null`
  - Implement `sendMessage(content: string): Promise<void>`:
    - Optimistically append the user message
    - POST to `/api/chat` with the full updated messages array
    - On success, append the assistant message from the response
    - On error, roll back the optimistic user message and set `error`
    - Always clear `isLoading` in a `finally` block
  - Implement `clearError(): void` and `resetConversation(): void`
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.2, 7.3_

  - [ ]* 9.1 Write unit tests for `useChatApi` (`src/hooks/useChatApi.test.ts`)
    - Mock `fetch`
    - Test: `sendMessage` appends user message then assistant message on success
    - Test: `sendMessage` sets `isLoading` true during request and false after
    - Test: failed fetch sets `error` and rolls back the optimistic user message
    - Test: `clearError` resets error to null
    - Test: `resetConversation` clears messages array
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 7.1_

- [x] 10. Build chat UI components
  - [x] 10.1 Create `src/components/chat/LoadingIndicator.tsx`
    - Render an animated three-dot typing indicator
    - No props needed
    - _Requirements: 2.1_

  - [x] 10.2 Create `src/components/chat/MessageList.tsx`
    - Accept `messages: Message[]` and `isLoading: boolean` props
    - Render each message with visually distinct styles for `user` vs `assistant` roles
    - Show `<LoadingIndicator />` when `isLoading` is true
    - Use a `useEffect` + `ref` to auto-scroll to the bottom when messages change
    - Render assistant message content through `react-markdown` with `disallowedElements={['script','iframe','object','embed']}` and `unwrapDisallowed`
    - _Requirements: 3.1, 3.2, 3.3, 9.1, 9.6_

  - [x] 10.3 Create `src/components/chat/MessageInput.tsx`
    - Accept `onSend: (content: string) => void` and `disabled: boolean` props
    - Render a textarea and a send button
    - Submit on button click or Enter key (Shift+Enter inserts newline)
    - Clear the input after submission
    - Disable both textarea and button when `disabled` is true
    - _Requirements: 9.2, 9.3, 9.4, 9.5_

  - [x] 10.4 Create `src/components/chat/ChatPanel.tsx`
    - Compose `MessageList` and `MessageInput` using the `useChatApi` hook
    - Display a dismissible error banner above the input when `error` is set
    - Expose a `systemPrompt?: string` prop that, when provided, prepends a system message to the conversation on mount
    - _Requirements: 2.3, 2.4, 2.5, 9.1, 9.2_

- [x] 11. Integrate ChatPanel into ResultsPage
  - Import `ChatPanel` into `src/pages/ResultsPage.tsx`
  - Add a section below the existing analysis results (after the Suggestions card and before the "Analyze another" button) that renders `<ChatPanel />`
  - Pass a `systemPrompt` that gives the assistant context about the analysis result (e.g., scores and summary) so it can answer follow-up questions
  - Add `react-markdown` to the frontend dependencies: `npm install react-markdown`
  - _Requirements: 9.7, 3.2, 1.1_

- [x] 12. Checkpoint — end-to-end integration
  - Run frontend tests: `npx vitest run` from the project root
  - Confirm the Vite proxy config is correct and the frontend can reach the backend
  - Ask the user if any questions arise before final polish.

- [x] 13. Final setup files and documentation
  - Create `server/.env` (gitignored) with `OPENAI_API_KEY=` placeholder and correct defaults
  - Verify `server/.env` is listed in `.gitignore`
  - Add a `## Chat Integration` section to `README.md` with setup steps: install server deps, copy `.env.example` to `.env`, add API key, run backend with `cd server && npm run dev`, run frontend with `npm run dev`
  - _Requirements: 5.1, 5.2, 5.3_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The chat panel is embedded in ResultsPage — no new React Router route is added
- The backend lives in `server/` with its own `package.json`; it is a separate Node process from the Vite dev server
- The Vite proxy (`/api → http://localhost:3001`) handles CORS in development so no browser CORS errors occur
- Default model is `gpt-4o-mini` (cost-effective); override via `OPENAI_MODEL` env var
- All tests use Vitest (frontend via existing config, backend via `server/package.json`)
