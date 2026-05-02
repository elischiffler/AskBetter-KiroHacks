# Requirements Document

## Introduction

AskBetter is a coaching tool that analyzes pasted ChatGPT conversation transcripts and returns structured feedback to help users improve the quality of their prompting habits. This document covers the backend/API layer: a standalone HTTP server (Express or Fastify) added alongside the existing Vite + React frontend. The server exposes a single primary endpoint (`POST /api/analyze`) that reuses the existing `parser`, `classifier`, and `analyzer` modules from `src/lib/` and returns a typed `ConversationAnalysis` response. The backend must be hackathon-simple, fully testable with Vitest, and require no external API key for the baseline rule-based flow.

---

## Glossary

- **API_Server**: The standalone Node.js/TypeScript HTTP server (Express or Fastify) that hosts the backend routes.
- **Analyze_Endpoint**: The `POST /api/analyze` HTTP route exposed by the API_Server.
- **Transcript**: A raw string containing a pasted ChatGPT conversation supplied by the client.
- **Parser**: The module (`src/lib/parser.ts`) responsible for extracting user messages from a Transcript.
- **Classifier**: The module (`src/lib/classifier.ts`) responsible for assigning exactly one `PromptCategory` to each extracted user message.
- **Scoring_Engine**: The scoring logic inside `src/lib/analyzer.ts` that computes the four `ConversationScores` (autonomy, curiosity, criticalThinking, engagement), each in the range 0–100.
- **Pattern_Detector**: The pattern-detection logic inside `src/lib/analyzer.ts` that identifies behavioral patterns in a conversation.
- **Suggestion_Generator**: The insight-generation logic inside `src/lib/analyzer.ts` that produces a summary string and 2–3 suggestion strings.
- **ConversationAnalysis**: The top-level API response object (extends `AnalysisResult` with a `messages` alias for `prompts`).
- **PromptCategory**: One of four string literals — `"delegation"`, `"curiosity"`, `"collaborative"`, `"verification"`.
- **AnalyzedPrompt**: A classified user message object containing `text`, `category`, `isPassive`, `isActive`, and `wordCount`.
- **ConversationScores**: An object with four numeric fields: `autonomy`, `curiosity`, `criticalThinking`, `engagement`.
- **LLM_Adapter**: An optional provider interface that wraps an external language model (e.g., OpenAI) for future enhancement of classification or summary generation.
- **Zod_Schema**: A runtime validation schema defined with the Zod library, used to validate request bodies and enforce response shapes.
- **Request_Options**: An optional object in the request body containing flags such as `includeBreakdown` (boolean) and `sampleId` (string).

---

## Requirements

### Requirement 1: HTTP Server Initialization

**User Story:** As a developer, I want a standalone HTTP server that starts independently of the Vite frontend, so that the API can be developed, tested, and deployed separately.

#### Acceptance Criteria

1. THE API_Server SHALL listen on a configurable port (defaulting to `3001`) when started.
2. WHEN the API_Server starts successfully, THE API_Server SHALL log the listening address to stdout.
3. IF the configured port is already in use, THEN THE API_Server SHALL log a descriptive error message and exit with a non-zero status code.
4. THE API_Server SHALL parse JSON request bodies and set `Content-Type: application/json` on all responses.
5. THE API_Server SHALL include CORS headers that allow requests from `http://localhost:5173` (the Vite dev server origin) during development.

---

### Requirement 2: POST /api/analyze — Request Validation

**User Story:** As a client developer, I want the endpoint to validate its input and return clear errors, so that integration bugs are easy to diagnose.

#### Acceptance Criteria

1. WHEN a `POST /api/analyze` request is received with a valid JSON body containing a non-empty `transcript` string, THE Analyze_Endpoint SHALL proceed to analysis.
2. IF the request body is missing the `transcript` field, THEN THE Analyze_Endpoint SHALL return HTTP 400 with a JSON error body containing a `code` field set to `"MISSING_TRANSCRIPT"` and a human-readable `message` field.
3. IF the `transcript` field is present but is an empty string or contains only whitespace, THEN THE Analyze_Endpoint SHALL return HTTP 400 with a JSON error body containing a `code` field set to `"EMPTY_TRANSCRIPT"` and a human-readable `message` field.
4. IF the request body is not valid JSON, THEN THE Analyze_Endpoint SHALL return HTTP 400 with a JSON error body containing a `code` field set to `"INVALID_JSON"` and a human-readable `message` field.
5. THE Analyze_Endpoint SHALL validate the request body using a Zod_Schema before invoking any analysis logic.
6. WHERE the `options` field is present in the request body, THE Analyze_Endpoint SHALL accept an object with optional boolean field `includeBreakdown` and optional string field `sampleId`, and SHALL ignore any unrecognized fields.

---

### Requirement 3: POST /api/analyze — Transcript Parsing

**User Story:** As a user, I want to paste conversations in multiple formats, so that I am not forced to reformat my transcript before submitting.

#### Acceptance Criteria

1. WHEN a Transcript is received, THE Parser SHALL extract all user messages from it and return them as an array of non-empty strings.
2. WHEN a Transcript uses explicit role labels (`You:`, `User:`, or `Human:` prefixes), THE Parser SHALL extract only the lines attributed to the user role.
3. WHEN a Transcript uses alternating paragraph blocks with no role labels, THE Parser SHALL treat even-indexed blocks (0, 2, 4…) as user messages.
4. WHEN a Transcript contains no recognizable structure, THE Parser SHALL treat the entire Transcript as a single user message.
5. IF the Parser produces zero extracted messages from a non-empty Transcript, THEN THE Analyze_Endpoint SHALL return a valid `ConversationAnalysis` response with empty `messages`, zero scores, and a descriptive `summary` — rather than an error response.
6. THE Parser SHALL produce a round-trip-stable result: parsing a Transcript that was constructed by joining extracted messages with `\n\n` SHALL return the same messages (round-trip property).

---

### Requirement 4: POST /api/analyze — Classification

**User Story:** As a product owner, I want every user message to be assigned exactly one category, so that the distribution and scores are always consistent.

#### Acceptance Criteria

1. WHEN the Parser returns a non-empty array of messages, THE Classifier SHALL assign exactly one `PromptCategory` to each message.
2. THE Classifier SHALL assign one of the four valid categories: `"delegation"`, `"curiosity"`, `"collaborative"`, or `"verification"`.
3. WHEN no keyword signals match a message, THE Classifier SHALL assign the category `"delegation"` as the default.
4. WHEN multiple categories have equal signal counts, THE Classifier SHALL resolve the tie using the priority order: `curiosity` > `collaborative` > `verification` > `delegation`.
5. THE Classifier SHALL produce a deterministic result: calling the Classifier with the same message text SHALL always return the same `PromptCategory`.

---

### Requirement 5: POST /api/analyze — Scoring

**User Story:** As a user, I want to receive four numeric scores that reflect my prompting behavior, so that I can track improvement over time.

#### Acceptance Criteria

1. WHEN analysis completes, THE Scoring_Engine SHALL return a `ConversationScores` object containing all four fields: `autonomy`, `curiosity`, `criticalThinking`, and `engagement`.
2. THE Scoring_Engine SHALL produce scores in the integer range 0–100 inclusive for all four fields.
3. THE Scoring_Engine SHALL compute `autonomy` as the percentage of messages classified as non-delegation (curiosity + collaborative + verification) rounded to the nearest integer.
4. THE Scoring_Engine SHALL compute `curiosity` as the percentage of messages classified as `"curiosity"` rounded to the nearest integer.
5. THE Scoring_Engine SHALL compute `criticalThinking` as the percentage of messages classified as `"verification"` or `"collaborative"` rounded to the nearest integer.
6. WHEN the input contains zero messages, THE Scoring_Engine SHALL return all four scores as `0`.

---

### Requirement 6: POST /api/analyze — Pattern Detection and Suggestions

**User Story:** As a user, I want to receive behavioral patterns and actionable suggestions, so that I know specifically how to improve my prompting habits.

#### Acceptance Criteria

1. WHEN analysis completes, THE Pattern_Detector SHALL return an array of zero or more `DetectedPattern` objects, each with `id`, `label`, `description`, and `severity` fields.
2. THE Suggestion_Generator SHALL always return between 2 and 3 suggestion strings in the `suggestions` array.
3. THE Suggestion_Generator SHALL always return a non-empty `summary` string.
4. WHEN the input contains zero messages, THE Suggestion_Generator SHALL return a `summary` describing that no prompts were detected and SHALL return an empty `suggestions` array.
5. WHEN more than 60% of messages are classified as `"delegation"`, THE Pattern_Detector SHALL include a pattern with `id` `"mostly-delegation"` and `severity` `"warning"`.
6. WHEN at least 30% of messages are classified as `"curiosity"`, THE Pattern_Detector SHALL include a pattern with `id` `"active-learning"` and `severity` `"positive"`.

---

### Requirement 7: POST /api/analyze — Response Shape

**User Story:** As a frontend developer, I want a consistent, typed response object, so that I can render results without defensive null-checks.

#### Acceptance Criteria

1. WHEN analysis succeeds, THE Analyze_Endpoint SHALL return HTTP 200 with a JSON body conforming to the `ConversationAnalysis` shape.
2. THE Analyze_Endpoint SHALL include a `messages` field in the response that is an alias for the `prompts` array (both fields SHALL reference the same data).
3. THE Analyze_Endpoint SHALL include all of the following top-level fields in every successful response: `messages`, `prompts`, `distribution`, `scores`, `patterns`, `passiveExamples`, `activeExamples`, `suggestions`, and `summary`.
4. WHEN the `options.includeBreakdown` flag is `false` or absent, THE Analyze_Endpoint SHALL omit the `prompts` field from the response to reduce payload size.
5. WHERE `options.includeBreakdown` is `true`, THE Analyze_Endpoint SHALL include the full `prompts` array in the response.

---

### Requirement 8: Error Response Format

**User Story:** As a client developer, I want all errors to follow a consistent JSON structure, so that error handling code is uniform across the application.

#### Acceptance Criteria

1. THE Analyze_Endpoint SHALL return all error responses as JSON objects with at minimum a `code` string field and a `message` string field.
2. IF an unexpected internal error occurs during analysis, THEN THE Analyze_Endpoint SHALL return HTTP 500 with a JSON error body containing `code` set to `"INTERNAL_ERROR"` and a safe, non-stack-trace `message`.
3. THE API_Server SHALL not expose raw stack traces or internal file paths in any error response sent to clients.

---

### Requirement 9: LLM Adapter Interface

**User Story:** As a developer, I want a provider adapter interface for future LLM integration, so that the rule-based engine can be swapped for an AI-powered one without changing the API contract.

#### Acceptance Criteria

1. THE API_Server SHALL define a `AnalysisProvider` TypeScript interface with at minimum a method `analyze(transcript: string, options?: RequestOptions): Promise<ConversationAnalysis>`.
2. THE API_Server SHALL include a `RuleBasedProvider` class that implements `AnalysisProvider` using the existing Parser, Classifier, Scoring_Engine, Pattern_Detector, and Suggestion_Generator modules.
3. WHERE an `OPENAI_API_KEY` environment variable is not set, THE API_Server SHALL use the `RuleBasedProvider` as the default provider.
4. THE `RuleBasedProvider` SHALL produce a deterministic result: calling it with the same Transcript SHALL always return the same `ConversationAnalysis`.
5. THE API_Server SHALL export the `AnalysisProvider` interface so that future LLM adapter implementations can be added without modifying the core server file.

---

### Requirement 10: Testing Coverage

**User Story:** As a developer, I want a Vitest test suite covering all backend modules, so that regressions are caught before deployment.

#### Acceptance Criteria

1. THE test suite SHALL include Parser tests covering at minimum: labeled format, alternating-block format, single-message fallback, and empty-string input.
2. THE test suite SHALL include Classifier tests covering at minimum: each of the four categories, tie-break resolution, and zero-signal default.
3. THE test suite SHALL include Scoring_Engine tests verifying that all four scores are integers in the range 0–100 for any valid input array.
4. THE test suite SHALL include an endpoint contract test for `POST /api/analyze` that verifies the response shape against the `ConversationAnalysis` Zod_Schema for at least two distinct sample transcripts.
5. THE test suite SHALL include a round-trip property test for the Parser: for any array of non-empty strings, joining them with `\n\n` and parsing the result SHALL return the original strings.
