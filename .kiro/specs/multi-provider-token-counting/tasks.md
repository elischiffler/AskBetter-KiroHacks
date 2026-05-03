# Implementation Plan: Multi-Provider Token Counting

## Overview

This plan implements multi-provider token counting for AskBetter, adding Gemini and Perplexity server-side adapters alongside the existing OpenAI/js-tiktoken local estimator. The work proceeds bottom-up: server-side infrastructure first (registry, validator, adapters, endpoint), then frontend extensions (provider types, UI controls, display updates). Each task builds on the previous, and checkpoints ensure incremental validation.

## Tasks

- [x] 1. Set up server-side test infrastructure and install dependencies
  - [x] 1.1 Add `js-tiktoken`, `vitest`, and `fast-check` to server dependencies
    - Add `js-tiktoken` to `server/package.json` production dependencies
    - Add `vitest` and `fast-check` to `server/package.json` devDependencies
    - Add a `"test": "vitest --run"` script to `server/package.json`
    - Run `npm install` in `server/`
    - _Requirements: 10.1_

- [x] 2. Implement provider registry and request validator
  - [x] 2.1 Create `server/providerRegistry.js`
    - Define `PROVIDERS` object with entries for `openai` (model `gpt-4o`, apiKeyEnv `""`, endpoint `local`), `gemini` (model `gemini-2.5-pro`, apiKeyEnv `GEMINI_API_KEY`, endpoint `:countTokens`), and `perplexity` (model `sonar-pro`, apiKeyEnv `PERPLEXITY_API_KEY`, endpoint `/chat/completions`)
    - Export `PROVIDERS`, `VALID_PROVIDERS`, and `getProviderConfig(providerName)` which returns the matching config or `null`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 2.2 Write property test for provider lookup correctness
    - **Property 1: Provider lookup correctness**
    - **Validates: Requirements 1.1, 1.6**
    - Create `server/__tests__/providerRegistry.property.test.js`
    - Use `fc.constantFrom('openai', 'gemini', 'perplexity')` for valid providers and `fc.string()` filtered for invalid ones
    - Assert valid providers return matching config with `provider` equal to input; invalid strings return `null`

  - [x] 2.3 Create `server/validateTokenRequest.js`
    - Implement `validateTokenRequest(body)` that checks: missing `provider` → 400 `"provider field is required"`, invalid provider → 400 `"unsupported provider"`, missing/empty/non-array `messages` → 400 `"messages must be a non-empty array"`, message missing `role`/`content` strings → 400 `"each message must have role and content strings"`
    - Default `model` from provider registry when not provided
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 2.4 Write property tests for request validation
    - **Property 4: Invalid provider rejection**
    - **Property 5: Invalid messages rejection**
    - **Validates: Requirements 5.6, 5.7, 9.1, 9.2, 9.3, 9.4**
    - Create `server/__tests__/validateTokenRequest.property.test.js`
    - Generate random invalid provider strings and malformed message arrays
    - Assert validator returns `{ valid: false, status: 400 }` with correct error messages

- [x] 3. Implement server-side adapters
  - [x] 3.1 Create `server/adapters/localEstimator.js`
    - Initialize `js-tiktoken` with `cl100k_base` encoding at module load
    - Export `estimateTokensLocal(text)` returning token count (0 on failure)
    - Export `estimateTokensFromMessages(messages)` that concatenates message contents with newlines and calls `estimateTokensLocal`
    - _Requirements: 10.2, 10.3, 10.4_

  - [ ]* 3.2 Write property test for local estimation determinism
    - **Property 7: Server-side local estimation is deterministic**
    - **Validates: Requirements 10.2, 10.4**
    - Create `server/__tests__/localEstimator.property.test.js`
    - Use `fc.string()` generator, call `estimateTokensLocal` twice on same input
    - Assert both calls return identical non-negative integer results

  - [x] 3.3 Create `server/adapters/geminiAdapter.js`
    - Implement `countTokensGemini(messages, model)` that checks `GEMINI_API_KEY` env var (throw 503 if missing), converts messages to Gemini `contents` format (role `assistant` → `model`, each message gets `parts: [{ text }]`), sends POST to `https://generativelanguage.googleapis.com/v1beta/models/{model}:countTokens?key={apiKey}` with 10-second timeout via `AbortController`, extracts `totalTokens` from response
    - Throw descriptive errors on API error or timeout
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 2.1_

  - [ ]* 3.4 Write unit tests for Gemini adapter
    - Create `server/__tests__/geminiAdapter.test.js`
    - Mock `node-fetch` to test: successful response returns `totalTokens`, error response throws with status, timeout throws timeout error, missing API key throws 503, role mapping (`assistant` → `model`)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.5 Create `server/adapters/perplexityAdapter.js`
    - Implement `countTokensPerplexity(messages, model)` that checks `PERPLEXITY_API_KEY` env var (throw 503 if missing), sends POST to `https://api.perplexity.ai/chat/completions` with `Authorization: Bearer {key}`, body `{ model, messages, max_tokens: 1 }`, 15-second timeout via `AbortController`, extracts `usage.prompt_tokens` and optionally `usage.cost`
    - Throw descriptive errors on API error or timeout
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 2.2_

  - [ ]* 3.6 Write unit tests for Perplexity adapter
    - Create `server/__tests__/perplexityAdapter.test.js`
    - Mock `node-fetch` to test: successful response returns `inputTokens`, response with cost includes cost breakdown, error response throws with status, timeout throws timeout error, missing API key throws 503, request body includes `max_tokens: 1`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 4. Checkpoint
  - Ensure all server-side module tests pass, ask the user if questions arise.

- [x] 5. Wire up the token-counting endpoint
  - [x] 5.1 Add `POST /api/count-tokens` route to `server/index.js`
    - Import `validateTokenRequest`, `getProviderConfig`, `countTokensGemini`, `countTokensPerplexity`, `estimateTokensFromMessages`
    - Validate request; return 400 on invalid input
    - For `openai`: use `estimateTokensFromMessages`, return `estimationType: "local_estimate"`
    - For `gemini`/`perplexity`: check API key availability (return 503 if missing), dispatch to adapter, return `estimationType: "provider_count"`
    - On adapter error: fall back to `estimateTokensFromMessages`, return `estimationType: "local_estimate"` with `warning` field
    - Return `NormalizedResponse` shape: `{ inputTokens, estimationType, provider, model }` (plus optional `warning`)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 6.1, 6.3, 6.4, 2.3, 2.5_

  - [ ]* 5.2 Write property test for normalized response shape
    - **Property 3: Normalized response shape conformance**
    - **Validates: Requirements 5.5**
    - Create `server/__tests__/countTokensEndpoint.property.test.js`
    - Generate valid request payloads with random messages and valid providers
    - Mock adapters; assert response has `inputTokens` (non-negative), `estimationType` (valid value), `provider` (matches request), `model` (non-empty string)

  - [ ]* 5.3 Write property test for fallback behavior
    - **Property 6: Fallback produces valid response with warning**
    - **Validates: Requirements 6.1, 6.3, 5.8**
    - Add to `server/__tests__/countTokensEndpoint.property.test.js`
    - Generate random error types combined with valid request payloads
    - Mock adapters to throw; assert response has `estimationType: "local_estimate"` and non-empty `warning` string

  - [ ]* 5.4 Write unit tests for the count-tokens endpoint
    - Create `server/__tests__/countTokensEndpoint.test.js`
    - Test: OpenAI uses local estimator, Gemini dispatches to adapter, Perplexity dispatches to adapter, adapter failure triggers fallback with warning, missing API key returns 503, validation errors return 400
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 6.1, 6.2, 6.3_

- [x] 6. Checkpoint
  - Ensure all server-side tests pass including endpoint tests, ask the user if questions arise.

- [x] 7. Extend frontend provider types and configuration
  - [x] 7.1 Extend `askbetter/src/analysis/tokenConfig.ts` with provider types
    - Add `TokenProvider` type (`"openai" | "gemini" | "perplexity"`)
    - Add `EstimationType` type (`"provider_count" | "local_estimate"`)
    - Add `ProviderOption` interface with `provider`, `label`, `model`, `methodNote`
    - Add `PROVIDER_OPTIONS` array with entries for OpenAI (`"Estimated locally."`), Gemini (`"Counted via Gemini countTokens API."`), Perplexity (`"Counted via Perplexity chat completion usage field."`)
    - Add `NormalizedTokenResponse` interface with `inputTokens`, `estimationType`, `provider`, `model`, optional `warning`
    - Keep existing `TOKEN_CONFIG` export unchanged
    - _Requirements: 1.1, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 8. Update TokenUsageCard with provider display support
  - [x] 8.1 Extend `askbetter/src/components/TokenUsageCard.tsx`
    - Add new optional props: `providerLabel` (string), `methodNote` (string), `warningNote` (string), `isLoading` (boolean)
    - When `isLoading` is true, show a spinner/skeleton in place of the token count
    - When `providerLabel` is set, display it as the estimation label
    - When `methodNote` is set, display it below the token count
    - When `warningNote` is set, display a warning banner indicating fallback occurred
    - Continue rendering existing `disclaimer` at the bottom
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 7.5_

- [x] 9. Add provider selection and server call logic to ResultsPage
  - [x] 9.1 Update `askbetter/src/pages/ResultsPage.tsx` with provider selector
    - Add state for `selectedProvider` (default `"openai"`), `isCountingTokens`, `providerTokenResult`
    - Add a three-button toggle (OpenAI / Gemini / Perplexity) above the `TokenUsageCard`
    - When `"openai"` is selected, use existing client-side `estimateTokens()` — no server call
    - When `"gemini"` or `"perplexity"` is selected, POST to `/api/count-tokens` with `{ provider, model, messages }` where messages are the analyzed prompt texts
    - On success, update `TokenUsageCard` with provider-specific label, method note, and token count
    - On server error or fetch failure, fall back to client-side estimation and show warning note
    - Pass `isLoading` to `TokenUsageCard` while request is in progress
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 6.2, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 2.4_

- [x] 10. Final checkpoint
  - Ensure all tests pass (server and frontend), ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The server uses CommonJS (`require`/`module.exports`) consistent with the existing codebase
- The frontend uses TypeScript with React 19 and Vite 8
- `fast-check` is already available in `askbetter/`; it needs to be added to `server/` devDependencies
