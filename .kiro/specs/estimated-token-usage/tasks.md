# Implementation Plan: Estimated Token Usage

## Overview

This plan implements client-side token counting and cost estimation for AskBetter's analysis pipeline. The feature adds three new utility modules (`tokenConfig.ts`, `tokenEstimator.ts`, `costCalculator.ts`), extends the existing `AnalysisResult` type and `analyzeConversation()` function, and renders a new Token Usage Card at the bottom of the Results page. All code is TypeScript, all analysis logic stays framework-agnostic in `src/analysis/`, and the UI follows existing dark-theme card conventions.

## Tasks

- [x] 1. Install dependencies and set up test framework
  - [x] 1.1 Add `js-tiktoken` as a production dependency
    - Run `npm install js-tiktoken` in `askbetter/`
    - Verify the dependency appears in `askbetter/package.json` under `dependencies`
    - Run `npm run build` in `askbetter/` to confirm the build completes without errors
    - _Requirements: 7.1, 7.2_

  - [x] 1.2 Add Vitest and fast-check as dev dependencies
    - Run `npm install -D vitest fast-check` in `askbetter/`
    - Add a `"test"` script to `askbetter/package.json`: `"test": "vitest --run"`
    - Create a minimal `askbetter/vitest.config.ts` that extends the existing Vite config
    - Verify `npm test` runs successfully (no tests yet, but no errors)
    - _Requirements: (testing infrastructure for all subsequent test tasks)_

- [x] 2. Create token configuration module
  - [x] 2.1 Create `askbetter/src/analysis/tokenConfig.ts`
    - Export a `TOKEN_CONFIG` constant object with fields: `encoding` (`'cl100k_base'`), `pricePerMillion` (`2.50`), `label`, `disclaimer`, and `fallbackDisclaimer`
    - Use `as const` assertion for immutability
    - All string values must match the design document exactly
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Create cost calculation utility
  - [x] 3.1 Create `askbetter/src/analysis/costCalculator.ts`
    - Export a `calculateCost(tokens: number, pricePerMillion: number): number` function
    - Return `0` when `tokens <= 0` or `pricePerMillion <= 0`
    - Otherwise return `(tokens / 1_000_000) * pricePerMillion` at full floating-point precision (no rounding)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 3.2 Write unit tests for costCalculator
    - Create `askbetter/src/analysis/__tests__/costCalculator.test.ts`
    - Test: `calculateCost(0, 2.50)` returns `0`
    - Test: `calculateCost(1_000_000, 2.50)` returns `2.50`
    - Test: `calculateCost(500, 2.50)` returns `0.00125`
    - Test: negative tokens returns `0`
    - Test: negative pricePerMillion returns `0`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 3.3 Write property test for costCalculator
    - Create `askbetter/src/analysis/__tests__/costCalculator.property.test.ts`
    - **Property 3: Cost calculation matches the formula exactly**
    - Generator: `fc.tuple(fc.nat(), fc.double({ min: 0.001, max: 1000, noNaN: true }))`
    - Assert: `calculateCost(tokens, rate) === (tokens / 1_000_000) * rate`
    - Assert: `calculateCost(0, rate) === 0`
    - **Validates: Requirements 2.1, 2.3, 2.4**

- [x] 4. Create token estimation utility
  - [x] 4.1 Create `askbetter/src/analysis/tokenEstimator.ts`
    - Import `Tiktoken` from `js-tiktoken/lite` and `cl100k_base` ranks from `js-tiktoken/ranks/cl100k_base`
    - Export a `TokenEstimate` interface: `{ tokens: number; fallback: boolean }`
    - Initialize a singleton `Tiktoken` encoder at module load in a try/catch; set `initFailed = true` on failure
    - Export `estimateTokens(text: string): TokenEstimate`:
      - If `initFailed` or encoder is null → return `{ tokens: 0, fallback: true }`
      - If `text.length === 0` → return `{ tokens: 0, fallback: false }`
      - Otherwise encode text in a try/catch, return `{ tokens: tokenIds.length, fallback: false }` or `{ tokens: 0, fallback: true }` on error
    - Export `isTokenizerAvailable(): boolean`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 4.2 Write unit tests for tokenEstimator
    - Create `askbetter/src/analysis/__tests__/tokenEstimator.test.ts`
    - Test: empty string returns `{ tokens: 0, fallback: false }`
    - Test: `"hello world"` returns a positive integer token count with `fallback: false`
    - Test: same input twice returns identical results (determinism)
    - Test: `isTokenizerAvailable()` returns `true` when encoder loaded
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 4.3 Write property tests for tokenEstimator
    - Create `askbetter/src/analysis/__tests__/tokenEstimator.property.test.ts`
    - **Property 1: Token estimation produces non-negative integers for all non-empty strings**
    - Generator: `fc.string({ minLength: 1 })`
    - Assert: `result.tokens >= 0 && Number.isInteger(result.tokens) && result.fallback === false`
    - **Validates: Requirements 1.1, 1.5**
    - **Property 2: Token estimation is deterministic**
    - Generator: `fc.string()`
    - Assert: two calls to `estimateTokens(s)` return identical `{ tokens, fallback }` results
    - **Validates: Requirements 1.3**

- [x] 5. Checkpoint — Verify utilities work
  - Ensure all tests pass (`npm test` in `askbetter/`)
  - Ensure `npm run build` completes without errors
  - Ask the user if questions arise.

- [x] 6. Extend AnalysisResult type and integrate into analyzer
  - [x] 6.1 Add token types to `askbetter/src/analysis/types.ts`
    - Add `TokenBreakdownEntry` interface: `{ index: number; tokens: number; costUsd: number }`
    - Add five new fields to the `AnalysisResult` interface: `tokenBreakdown`, `totalPromptTokens`, `estimatedPromptCostUsd`, `tokenEstimateLabel`, `tokenEstimateDisclaimer`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 6.2 Integrate token estimation into `askbetter/src/analysis/analyzer.ts`
    - Import `estimateTokens` from `tokenEstimator.ts`, `calculateCost` from `costCalculator.ts`, and `TOKEN_CONFIG` from `tokenConfig.ts`
    - After building the `prompts` array in `analyzeConversation()`, iterate to build `tokenBreakdown` using `estimateTokens` and `calculateCost`
    - Compute `totalPromptTokens` as the sum of all breakdown token counts
    - Compute `estimatedPromptCostUsd` via `calculateCost(totalPromptTokens, TOKEN_CONFIG.pricePerMillion)`
    - Set `tokenEstimateLabel` from `TOKEN_CONFIG.label`
    - Set `tokenEstimateDisclaimer` from `TOKEN_CONFIG.disclaimer`, or `TOKEN_CONFIG.fallbackDisclaimer` if any entry triggered `fallback: true`
    - Update `emptyResult()` to include zero-value token fields with standard label and disclaimer
    - Preserve all existing scoring, classification, pattern detection, and suggestion behavior unchanged
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 6.3 Write unit tests for analyzer token integration
    - Create `askbetter/src/analysis/__tests__/analyzer.token.test.ts`
    - Test: empty prompts → zero token fields, empty breakdown, standard disclaimer
    - Test: single prompt → breakdown has one entry with correct token count
    - Test: `totalPromptTokens` equals sum of breakdown tokens
    - Test: `tokenEstimateLabel` and `tokenEstimateDisclaimer` are populated from config
    - Test: existing scores, patterns, suggestions fields are still present and valid
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 5.7_

  - [ ]* 6.4 Write property tests for analyzer token integration
    - Create `askbetter/src/analysis/__tests__/analyzer.token.property.test.ts`
    - **Property 4: Analyzer token integration invariant**
    - Generator: `fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 20 })`
    - Assert: `tokenBreakdown.length === prompts.length`
    - Assert: each `tokenBreakdown[i].tokens === estimateTokens(prompts[i]).tokens`
    - Assert: `totalPromptTokens === sum of tokenBreakdown[i].tokens`
    - Assert: `estimatedPromptCostUsd === calculateCost(totalPromptTokens, TOKEN_CONFIG.pricePerMillion)`
    - **Validates: Requirements 4.2, 4.3, 5.1, 5.2, 5.3**
    - **Property 5: Analyzer preserves existing analysis behavior**
    - Generator: `fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 })`
    - Assert: `scores`, `patterns`, `suggestions`, `distribution`, `conversationArc` fields are present and structurally valid
    - **Validates: Requirements 5.7**

- [x] 7. Checkpoint — Verify analyzer integration
  - Ensure all tests pass (`npm test` in `askbetter/`)
  - Ensure `npm run build` completes without errors
  - Ask the user if questions arise.

- [x] 8. Build Token Usage Card UI component
  - [x] 8.1 Create `askbetter/src/components/TokenUsageCard.tsx`
    - Accept props: `totalTokens`, `estimatedCostUsd`, `breakdown` (array of `TokenBreakdownEntry`), `label`, `disclaimer`
    - Display total token count formatted with locale separators (e.g., `1,234`)
    - Display estimated cost formatted as USD rounded to six decimal places (e.g., `$0.001234`)
    - Render a per-prompt breakdown showing each prompt's 1-based index and token count
    - Render the disclaimer text in muted styling below the card content
    - Render the label text (e.g., "Estimated using cl100k_base encoding")
    - Handle zero values gracefully — display `0` tokens and `$0.000000` without errors
    - Follow existing card styling: dark background (`CARD_BG`), purple accent border (`BORDER`), consistent typography using `SectionLabel` and `SectionTitle` patterns
    - Use a Lucide icon (e.g., `Coins` or `Hash`) for the section header, consistent with other cards
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 8.2 Add TokenUsageCard to `askbetter/src/pages/ResultsPage.tsx`
    - Import `TokenUsageCard` component
    - Render it as a full-width card at the very bottom of the page, below the Feedback & Recommendations card
    - Pass `result.totalPromptTokens`, `result.estimatedPromptCostUsd`, `result.tokenBreakdown`, `result.tokenEstimateLabel`, and `result.tokenEstimateDisclaimer` as props
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 9. Final checkpoint — Full build and verification
  - Run `npm run build` in `askbetter/` to confirm the full build passes with no errors
  - Run `npm test` in `askbetter/` to confirm all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout — no language selection needed
- All analysis logic stays in `src/analysis/` with no React imports
- The UI component follows existing ResultsPage card conventions (dark theme, purple accents)
