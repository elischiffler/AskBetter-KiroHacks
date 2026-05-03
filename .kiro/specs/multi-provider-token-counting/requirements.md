# Requirements Document

## Introduction

Extend AskBetter's token estimation to support Gemini (Google) and Perplexity (Sonar API) via their server-side APIs, in addition to the existing local js-tiktoken estimator for OpenAI. The feature introduces a provider configuration system, server-side adapter functions (API keys must never be exposed to the frontend), a normalized request/response contract between frontend and backend, UI updates to show provider-specific labels and estimation method notes, and a fallback mechanism that gracefully degrades to local estimation when provider APIs are unavailable.

OpenAI token counting runs entirely client-side using js-tiktoken (no API key needed). Gemini uses a dedicated `countTokens` endpoint that returns token counts without generating a completion. Perplexity has no dedicated token-counting endpoint; instead, the adapter sends a minimal chat completion request to the Sonar API and reads the `usage.prompt_tokens` field from the response.

## Glossary

- **Token_Provider**: A string union type (`"openai" | "gemini" | "perplexity"`) identifying which AI provider's token-counting method to use.
- **Token_Config_Entry**: A configuration object describing a single provider/model combination, containing `provider` (Token_Provider), `model` (string), `apiKeyEnv` (string naming the server environment variable, or empty for client-side providers), and `endpoint` (string for the provider's API path).
- **Provider_Registry**: A module that holds all available Token_Config_Entry objects and exposes lookup by provider name.
- **Gemini_Adapter**: A server-side function that calls the Google Gemini `countTokens` endpoint (`POST https://generativelanguage.googleapis.com/v1beta/models/{model}:countTokens`) to obtain an exact input token count for a set of contents.
- **Perplexity_Adapter**: A server-side function that calls the Perplexity Sonar chat completions endpoint (`POST https://api.perplexity.ai/chat/completions`) with a minimal request, then reads `usage.prompt_tokens` from the response to obtain the input token count.
- **Token_Counting_Endpoint**: A new Express route on the server (`POST /api/count-tokens`) that accepts a normalized request, dispatches to the appropriate provider adapter, and returns a normalized response.
- **Normalized_Request**: The standard JSON payload the frontend sends to the Token_Counting_Endpoint: `{ provider, model, messages }`.
- **Normalized_Response**: The standard JSON payload the Token_Counting_Endpoint returns: `{ inputTokens, estimationType, provider, model }`.
- **Estimation_Type**: A string union (`"provider_count" | "local_estimate"`) indicating whether the token count came from a provider API or from the local js-tiktoken fallback.
- **Local_Estimator**: The existing client-side `estimateTokens()` function using js-tiktoken with cl100k_base encoding, which serves as the fallback when provider APIs are unavailable.
- **Token_Usage_Card**: The existing UI component on the Results_Page that displays token counts, cost, and disclaimers, extended to show provider-specific labels and estimation method notes.
- **Results_Page**: The React page component (`src/pages/ResultsPage.tsx`) that renders the full analysis output including the Token_Usage_Card.
- **Server**: The Express application in `server/index.js` that handles backend API routes.

## Requirements

### Requirement 1: Provider Configuration System

**User Story:** As a developer, I want a typed configuration system for token-counting providers, so that adding or modifying provider support requires changes in only one place.

#### Acceptance Criteria

1. THE Provider_Registry SHALL define a `TokenProvider` type as the union `"openai" | "gemini" | "perplexity"`.
2. THE Provider_Registry SHALL define a `TokenConfigEntry` interface containing `provider` (TokenProvider), `model` (string), `apiKeyEnv` (string), and `endpoint` (string).
3. THE Provider_Registry SHALL include a default Token_Config_Entry for OpenAI with model `"gpt-4o"`, apiKeyEnv `""` (empty, since OpenAI uses client-side estimation), and endpoint indicating local estimation.
4. THE Provider_Registry SHALL include a default Token_Config_Entry for Gemini with model `"gemini-2.5-pro"`, apiKeyEnv `"GEMINI_API_KEY"`, and endpoint `":countTokens"`.
5. THE Provider_Registry SHALL include a default Token_Config_Entry for Perplexity with model `"sonar-pro"`, apiKeyEnv `"PERPLEXITY_API_KEY"`, and endpoint `"/chat/completions"`.
6. WHEN a provider name is looked up, THE Provider_Registry SHALL return the matching Token_Config_Entry or indicate that the provider is not found.

### Requirement 2: Server Environment Variable Security

**User Story:** As a security-conscious developer, I want API keys stored exclusively in server-side environment variables, so that secrets are never exposed to the frontend.

#### Acceptance Criteria

1. THE Server SHALL read `GEMINI_API_KEY` from the server `.env` file at startup.
2. THE Server SHALL read `PERPLEXITY_API_KEY` from the server `.env` file at startup.
3. THE Server SHALL NOT include any API key values in responses sent to the frontend.
4. THE frontend codebase SHALL NOT contain, import, or reference any provider API key values or environment variables holding provider API keys.
5. IF a required API key environment variable is missing when a token-counting request arrives, THEN THE Server SHALL return an HTTP 503 response with a message indicating the API key is not configured.

### Requirement 3: Gemini Token-Counting Adapter

**User Story:** As a developer, I want a server-side adapter that calls the Google Gemini countTokens API, so that the system can obtain exact token counts for Gemini models.

#### Acceptance Criteria

1. WHEN the Gemini_Adapter receives an array of messages and a model name, THE Gemini_Adapter SHALL send a POST request to `https://generativelanguage.googleapis.com/v1beta/models/{model}:countTokens` with the `GEMINI_API_KEY` passed as the `key` query parameter.
2. WHEN the Gemini_Adapter receives an array of messages, THE Gemini_Adapter SHALL convert the normalized message format to the Gemini-expected `contents` array format, where each element contains a `role` field and a `parts` array with a single object containing a `text` field.
3. WHEN the Gemini API returns a successful response, THE Gemini_Adapter SHALL extract the `totalTokens` field from the response body and return it as the token count.
4. IF the Gemini API returns an error status code, THEN THE Gemini_Adapter SHALL throw an error containing the HTTP status code and error message from the response.
5. IF the Gemini API request times out after 10 seconds, THEN THE Gemini_Adapter SHALL throw a timeout error.

### Requirement 4: Perplexity Token-Counting Adapter

**User Story:** As a developer, I want a server-side adapter that calls the Perplexity Sonar API to obtain token counts, so that the system can report token usage for Perplexity models.

#### Acceptance Criteria

1. WHEN the Perplexity_Adapter receives an array of messages and a model name, THE Perplexity_Adapter SHALL send a POST request to `https://api.perplexity.ai/chat/completions` with the `Authorization` header set to `Bearer {PERPLEXITY_API_KEY}` and the `Content-Type` header set to `application/json`.
2. WHEN the Perplexity_Adapter constructs the request body, THE Perplexity_Adapter SHALL use the OpenAI-compatible format `{ model, messages }` and set `max_tokens` to 1 to minimize cost and latency, since the primary goal is reading token usage from the response rather than generating a completion.
3. WHEN the Perplexity API returns a successful response, THE Perplexity_Adapter SHALL extract the `usage.prompt_tokens` field from the response body and return it as the input token count.
4. WHEN the Perplexity API response includes a `usage.cost` object, THE Perplexity_Adapter SHALL include the cost breakdown (containing `input_tokens_cost`, `output_tokens_cost`, and `total_cost`) in the adapter result so that the endpoint can optionally forward it.
5. IF the Perplexity API returns an error status code, THEN THE Perplexity_Adapter SHALL throw an error containing the HTTP status code and error message from the response.
6. IF the Perplexity API request times out after 15 seconds, THEN THE Perplexity_Adapter SHALL throw a timeout error.

### Requirement 5: Normalized Token-Counting Endpoint

**User Story:** As a frontend developer, I want a single backend endpoint that accepts a provider-agnostic request and returns a uniform response, so that the frontend does not need to know provider-specific API details.

#### Acceptance Criteria

1. THE Server SHALL expose a `POST /api/count-tokens` route that accepts a JSON body conforming to the Normalized_Request shape: `{ provider: TokenProvider, model: string, messages: Array<{ role: string, content: string }> }`.
2. WHEN a valid Normalized_Request with provider `"gemini"` is received, THE Token_Counting_Endpoint SHALL dispatch to the Gemini_Adapter and return a Normalized_Response with `estimationType` set to `"provider_count"`.
3. WHEN a valid Normalized_Request with provider `"perplexity"` is received, THE Token_Counting_Endpoint SHALL dispatch to the Perplexity_Adapter and return a Normalized_Response with `estimationType` set to `"provider_count"`.
4. WHEN a valid Normalized_Request with provider `"openai"` is received, THE Token_Counting_Endpoint SHALL use the local js-tiktoken estimator on the server side and return a Normalized_Response with `estimationType` set to `"local_estimate"`.
5. THE Normalized_Response SHALL conform to the shape: `{ inputTokens: number, estimationType: EstimationType, provider: TokenProvider, model: string }`.
6. IF the `provider` field is missing or not one of the recognized Token_Provider values, THEN THE Token_Counting_Endpoint SHALL return an HTTP 400 response with a descriptive error message.
7. IF the `messages` field is missing, empty, or not an array of objects each containing `role` and `content` strings, THEN THE Token_Counting_Endpoint SHALL return an HTTP 400 response with a descriptive error message.
8. IF the provider adapter throws an error, THEN THE Token_Counting_Endpoint SHALL fall back to the local js-tiktoken estimator, return a Normalized_Response with `estimationType` set to `"local_estimate"`, and include a `warning` field describing the fallback reason.

### Requirement 6: Fallback Behavior

**User Story:** As a user, I want token counting to always produce a result even when a provider API is unavailable, so that the UI never shows a broken or empty state.

#### Acceptance Criteria

1. IF the provider API call fails for any reason (network error, timeout, authentication failure, server error), THEN THE Token_Counting_Endpoint SHALL fall back to the Local_Estimator and return a valid Normalized_Response with `estimationType` set to `"local_estimate"`.
2. IF the required API key for the requested provider is not configured, THEN THE Token_Counting_Endpoint SHALL return an HTTP 503 response with a message indicating the key is not configured, and the frontend SHALL fall back to the Local_Estimator on the client side.
3. WHEN a fallback to local estimation occurs due to a provider API failure, THE Normalized_Response SHALL include a `warning` string field describing the reason for the fallback.
4. THE Local_Estimator (existing js-tiktoken with cl100k_base) SHALL continue to function as the default estimation method for the `"openai"` provider and as the fallback for all other providers.

### Requirement 7: Frontend Provider Selection

**User Story:** As a user, I want to choose which AI provider to use for token counting, so that I can see token estimates specific to the model I actually use.

#### Acceptance Criteria

1. THE Results_Page SHALL provide a provider selection control allowing the user to choose between `"openai"`, `"gemini"`, and `"perplexity"`.
2. THE provider selection control SHALL default to `"openai"` (local estimation) so that the existing behavior is preserved when no selection is made.
3. WHEN the user selects `"gemini"` or `"perplexity"`, THE frontend SHALL send a Normalized_Request to the Token_Counting_Endpoint with the selected provider and model, passing the analyzed prompt texts as messages.
4. WHEN the user selects `"openai"`, THE frontend SHALL use the existing Local_Estimator on the client side without making a server request.
5. WHILE a provider API token-counting request is in progress, THE Token_Usage_Card SHALL display a loading indicator.
6. IF the server request fails or returns an HTTP error, THEN THE frontend SHALL fall back to the Local_Estimator and display the locally estimated token count with the appropriate estimation method label.

### Requirement 8: UI Provider Labels and Estimation Notes

**User Story:** As a user, I want to see which provider and estimation method was used for my token count, so that I understand the accuracy and source of the displayed numbers.

#### Acceptance Criteria

1. WHEN the token count was obtained via a provider API (estimationType is `"provider_count"`), THE Token_Usage_Card SHALL display the provider name and model (e.g., `"Gemini · gemini-2.5-pro"` or `"Perplexity · sonar-pro"`) as the estimation label.
2. WHEN the token count was obtained via the Gemini API, THE Token_Usage_Card SHALL display the note `"Counted via Gemini countTokens API."` below the token count.
3. WHEN the token count was obtained via the Perplexity API, THE Token_Usage_Card SHALL display the note `"Counted via Perplexity chat completion usage field."` below the token count.
4. WHEN the token count was obtained via the Local_Estimator (estimationType is `"local_estimate"`), THE Token_Usage_Card SHALL display the label `"Estimated using cl100k_base encoding"` as the estimation label.
5. WHEN the token count was obtained via the Local_Estimator, THE Token_Usage_Card SHALL display the note `"Estimated locally."` below the token count.
6. WHEN a fallback from a provider API to local estimation occurred, THE Token_Usage_Card SHALL display a warning note indicating that the provider API was unavailable and local estimation was used instead.
7. THE Token_Usage_Card SHALL continue to display the existing disclaimer about estimates differing from provider-billed tokens.

### Requirement 9: Request Payload Validation

**User Story:** As a developer, I want the server to validate incoming token-counting requests, so that malformed payloads are rejected with clear error messages before reaching provider APIs.

#### Acceptance Criteria

1. IF the request body is missing the `provider` field, THEN THE Token_Counting_Endpoint SHALL return HTTP 400 with the message `"provider field is required"`.
2. IF the `provider` field value is not one of `"openai"`, `"gemini"`, or `"perplexity"`, THEN THE Token_Counting_Endpoint SHALL return HTTP 400 with the message `"unsupported provider"`.
3. IF the request body is missing the `messages` field or `messages` is not a non-empty array, THEN THE Token_Counting_Endpoint SHALL return HTTP 400 with the message `"messages must be a non-empty array"`.
4. IF any element in the `messages` array is missing a `role` or `content` string field, THEN THE Token_Counting_Endpoint SHALL return HTTP 400 with the message `"each message must have role and content strings"`.
5. IF the `model` field is missing, THEN THE Token_Counting_Endpoint SHALL use the default model from the Provider_Registry for the specified provider.

### Requirement 10: Server-Side js-tiktoken for OpenAI Estimation

**User Story:** As a developer, I want the server to also support local token estimation via js-tiktoken, so that the OpenAI provider path and the fallback path can both run server-side when called through the endpoint.

#### Acceptance Criteria

1. THE Server SHALL include `js-tiktoken` as a dependency so that local token estimation can run server-side.
2. WHEN the Token_Counting_Endpoint receives a request with provider `"openai"`, THE Server SHALL tokenize the concatenated message contents using js-tiktoken with cl100k_base encoding and return the token count.
3. WHEN the Token_Counting_Endpoint falls back to local estimation for any provider, THE Server SHALL use the same js-tiktoken cl100k_base estimation logic.
4. THE server-side js-tiktoken estimation SHALL produce deterministic output, returning the same token count for the same input text across repeated invocations.
