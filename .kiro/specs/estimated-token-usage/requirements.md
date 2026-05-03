# Requirements Document

## Introduction

Add an Estimated Token Usage module to AskBetter so users can see the token volume and estimated input cost (USD) of their pasted chat history prompts. The feature uses the `js-tiktoken` library to compute token counts client-side, extends the analysis result contract with token fields, and renders a new card on the Results page. This is a read-only, deterministic, MVP-scoped feature — no backend changes, no completion token tracking, and no persistence changes.

## Glossary

- **Token_Estimator**: A utility module that accepts a text string and returns a deterministic token count using the `js-tiktoken` library with the `cl100k_base` encoding. Returns zero and signals a fallback flag if the tokenizer fails to load.
- **Cost_Calculator**: A utility function that converts a token count and a price-per-million-tokens rate into an estimated cost in USD.
- **Analyzer**: The existing analysis engine entry point (`src/analysis/analyzer.ts`) that processes raw user prompts and produces an `AnalysisResult`.
- **Token_Config**: A central configuration object holding the tokenizer encoding name, price per 1 million input tokens, display label, and disclaimer text.
- **Results_Page**: The React page component (`src/pages/ResultsPage.tsx`) that renders the full analysis output.
- **Token_Usage_Card**: A new UI card section on the Results_Page that displays total prompt tokens, estimated input cost, per-prompt breakdown, and a disclaimer.
- **Analysis_Result**: The shared TypeScript interface describing the full output of the Analyzer, extended with token-related fields.

## Requirements

### Requirement 1: Token Estimation Utility

**User Story:** As a developer, I want a utility module that estimates token counts for arbitrary text, so that the analysis engine can compute token usage without coupling to a specific tokenizer API.

#### Acceptance Criteria

1. WHEN a non-empty text string is provided, THE Token_Estimator SHALL return a non-negative integer representing the estimated token count using the `cl100k_base` encoding from `js-tiktoken`.
2. WHEN an empty string is provided, THE Token_Estimator SHALL return zero.
3. THE Token_Estimator SHALL produce deterministic output, returning the same token count for the same input text across repeated invocations.
4. IF the `js-tiktoken` tokenizer fails to load or throws during initialization, THEN THE Token_Estimator SHALL return zero tokens and set a fallback disclaimer flag so the caller can inform the user that token estimation was unavailable.
5. FOR ALL valid text strings, encoding then counting tokens SHALL produce a count that is greater than or equal to zero (round-trip sanity property).

### Requirement 2: Cost Calculation Utility

**User Story:** As a developer, I want a function that converts token counts to estimated USD cost, so that the UI can display a dollar figure alongside token counts.

#### Acceptance Criteria

1. WHEN a token count and a price-per-million-tokens rate are provided, THE Cost_Calculator SHALL return the estimated cost in USD as a number.
2. WHEN a token count of zero is provided, THE Cost_Calculator SHALL return zero.
3. THE Cost_Calculator SHALL compute cost using the formula: `(tokens / 1_000_000) * pricePerMillion`.
4. THE Cost_Calculator SHALL return the result at full floating-point precision without rounding; rounding for display SHALL occur only at the UI layer.

### Requirement 3: Token Configuration

**User Story:** As a developer, I want a single central configuration for tokenizer settings and pricing, so that encoding, cost rate, labels, and disclaimers can be updated in one place.

#### Acceptance Criteria

1. THE Token_Config SHALL define the tokenizer encoding name as a string (default: `"cl100k_base"`).
2. THE Token_Config SHALL define the price per 1 million input tokens as a number.
3. THE Token_Config SHALL define a display label string describing the estimation method (e.g., `"Estimated using cl100k_base"`).
4. THE Token_Config SHALL define a disclaimer string stating that estimates are based on pasted user messages only and may differ from provider-billed tokens.
5. THE Token_Config SHALL define a fallback disclaimer string to be used when the tokenizer fails to load, indicating that token estimation was unavailable for the current analysis.

### Requirement 4: Analysis Result Contract Extension

**User Story:** As a developer, I want the AnalysisResult type to include token usage fields, so that the Results page can render token data without additional computation.

#### Acceptance Criteria

1. THE Analysis_Result SHALL include a `tokenBreakdown` field containing an array of objects, each with `index` (number), `tokens` (number), and `costUsd` (number) corresponding to each analyzed prompt.
2. THE Analysis_Result SHALL include a `totalPromptTokens` field as a non-negative integer representing the sum of all per-prompt token counts.
3. THE Analysis_Result SHALL include an `estimatedPromptCostUsd` field as a non-negative number representing the total estimated input cost in USD.
4. THE Analysis_Result SHALL include a `tokenEstimateLabel` field as a string sourced from Token_Config.
5. THE Analysis_Result SHALL include a `tokenEstimateDisclaimer` field as a string sourced from Token_Config.

### Requirement 5: Analyzer Integration

**User Story:** As a user, I want the analysis engine to compute token estimates automatically when I analyze a conversation, so that token data is available on the results page without a separate step.

#### Acceptance Criteria

1. WHEN the Analyzer processes a non-empty list of prompts, THE Analyzer SHALL compute a token count for each prompt using the Token_Estimator and include the results in the `tokenBreakdown` field of the Analysis_Result.
2. WHEN the Analyzer processes a non-empty list of prompts, THE Analyzer SHALL compute `totalPromptTokens` as the sum of all individual prompt token counts.
3. WHEN the Analyzer processes a non-empty list of prompts, THE Analyzer SHALL compute `estimatedPromptCostUsd` using the Cost_Calculator with the total token count and the rate from Token_Config.
4. WHEN the Analyzer processes an empty list of prompts, THE Analyzer SHALL return zero for `totalPromptTokens` and `estimatedPromptCostUsd`, an empty `tokenBreakdown` array, and the label and disclaimer from Token_Config.
5. IF the Token_Estimator signals a tokenizer-load failure, THEN THE Analyzer SHALL set all token counts and cost fields to zero, return an empty `tokenBreakdown` array, and replace the `tokenEstimateDisclaimer` with a fallback message indicating that token estimation was unavailable.
6. THE Analyzer SHALL populate `tokenEstimateLabel` and `tokenEstimateDisclaimer` from Token_Config in every Analysis_Result, unless overridden by a tokenizer-failure fallback disclaimer per criterion 5.
7. THE Analyzer SHALL preserve all existing scoring, classification, pattern detection, and suggestion behavior unchanged, including when the tokenizer fails to load.

### Requirement 6: Token Usage Card on Results Page

**User Story:** As a user, I want to see my estimated token usage and cost on the results page, so that I can understand the resource footprint of my prompts.

#### Acceptance Criteria

1. WHEN an Analysis_Result with token data is available, THE Results_Page SHALL render a Token_Usage_Card section displaying the `totalPromptTokens` value.
2. WHEN an Analysis_Result with token data is available, THE Results_Page SHALL render the `estimatedPromptCostUsd` value formatted as USD, rounded to six decimal places at the display layer (e.g., `$0.001234`).
3. THE Token_Usage_Card SHALL display the `tokenEstimateDisclaimer` text so users understand the estimate's limitations.
4. THE Token_Usage_Card SHALL display a per-prompt breakdown showing each prompt's index and token count.
5. WHILE the `totalPromptTokens` value is zero, THE Token_Usage_Card SHALL display zero values without errors or missing content.
6. THE Token_Usage_Card SHALL follow the existing card styling conventions used on the Results_Page (dark theme, purple accent borders, consistent typography).

### Requirement 7: Dependency Installation

**User Story:** As a developer, I want `js-tiktoken` added as a project dependency, so that the Token_Estimator can use it at runtime.

#### Acceptance Criteria

1. THE project SHALL include `js-tiktoken` as a production dependency in `askbetter/package.json`.
2. WHEN the application is built, THE build process SHALL complete without errors related to the `js-tiktoken` dependency.
