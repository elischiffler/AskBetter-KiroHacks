# Requirements Document

## Introduction

This document specifies requirements for integrating a server-side LLM API (OpenAI) into the existing AskBetter application. The feature enables users to send messages through a chat UI and receive real model responses while maintaining conversation context across multiple turns. The integration prioritizes security (server-side API key management), resilience (timeout and retry handling), and user experience (loading states, error handling, and response formatting).

## Glossary

- **Chat_UI**: The frontend React component that displays conversation messages and accepts user input
- **Backend_Server**: The Node.js server (Express or Fastify) that handles API requests and communicates with the LLM provider
- **LLM_Provider**: The OpenAI API service that generates model responses
- **Conversation_History**: An ordered array of message objects containing role and content fields
- **Message**: A single conversation turn with a role ("system", "user", or "assistant") and text content
- **API_Route**: The backend HTTP endpoint that receives chat requests and returns LLM responses
- **Frontend_Client**: The browser-based React application that sends requests to the Backend_Server
- **Retry_Policy**: The bounded retry mechanism with fixed retry count and backoff for transient failures
- **Telemetry_Logger**: The backend logging system that records request failures and latency metrics

## Requirements

### Requirement 1: Chat Request Flow

**User Story:** As a user, I want to send messages to an LLM through the chat interface, so that I can have a conversation with the AI model.

#### Acceptance Criteria

1. WHEN a user submits a message, THE Chat_UI SHALL send a request to the API_Route with the full Conversation_History
2. THE Conversation_History SHALL include all previous messages with role ("system", "user", or "assistant") and content fields
3. THE Frontend_Client SHALL NOT make direct calls to the LLM_Provider
4. WHEN the API_Route receives a request, THE Backend_Server SHALL forward the Conversation_History to the LLM_Provider
5. WHEN the LLM_Provider returns a response, THE Backend_Server SHALL return the assistant message to the Frontend_Client

### Requirement 2: UI State Management

**User Story:** As a user, I want clear feedback while waiting for responses, so that I know the system is processing my request.

#### Acceptance Criteria

1. WHEN a request is in progress, THE Chat_UI SHALL display a loading indicator
2. WHEN the Backend_Server returns a successful response, THE Chat_UI SHALL append the assistant message to the message list
3. IF the Backend_Server returns an error, THEN THE Chat_UI SHALL display a user-friendly error message
4. WHEN an error occurs, THE Chat_UI SHALL preserve the conversation state and remain usable
5. THE Chat_UI SHALL NOT reset or crash when an error occurs

### Requirement 3: Response Rendering

**User Story:** As a user, I want assistant responses to be readable and properly formatted, so that I can understand the content easily.

#### Acceptance Criteria

1. THE Chat_UI SHALL render assistant message content with line breaks preserved
2. WHERE markdown formatting is supported, THE Chat_UI SHALL render basic markdown elements (bold, italic, code blocks, lists)
3. THE Chat_UI SHALL display assistant messages in a visually distinct style from user messages

### Requirement 4: Resilience and Error Handling

**User Story:** As a user, I want the system to handle temporary failures gracefully, so that transient network issues do not disrupt my conversation.

#### Acceptance Criteria

1. WHEN a request to the LLM_Provider times out, THE Backend_Server SHALL retry the request according to the Retry_Policy
2. THE Retry_Policy SHALL limit retries to a maximum of 3 attempts
3. THE Retry_Policy SHALL use exponential backoff with a base delay of 1 second
4. WHEN all retry attempts fail, THE Backend_Server SHALL return an error response with a plain language error message
5. THE Backend_Server SHALL set a request timeout of 30 seconds for LLM_Provider requests
6. IF the LLM_Provider returns a rate limit error, THEN THE Backend_Server SHALL return a specific error message indicating rate limiting

### Requirement 5: Security and Secret Management

**User Story:** As a developer, I want API credentials to remain secure, so that unauthorized users cannot access the LLM service.

#### Acceptance Criteria

1. THE Backend_Server SHALL store the OpenAI API key in a server-side environment variable
2. THE Backend_Server SHALL load the API key from a .env file during initialization
3. THE Frontend_Client SHALL NOT contain any API keys or credentials in the bundle
4. THE Frontend_Client SHALL NOT send API keys in request payloads
5. THE Backend_Server SHALL NOT expose API keys in response payloads or error messages
6. THE Backend_Server SHALL NOT log API keys in telemetry or error logs

### Requirement 6: Observability and Telemetry

**User Story:** As a developer, I want visibility into request failures and performance, so that I can diagnose issues and monitor system health.

#### Acceptance Criteria

1. WHEN a request to the LLM_Provider fails, THE Telemetry_Logger SHALL log the failure with non-sensitive context (status code, error type, timestamp)
2. WHEN a request to the LLM_Provider completes, THE Telemetry_Logger SHALL log the request duration in milliseconds
3. THE Telemetry_Logger SHALL NOT log message content or user data
4. THE Telemetry_Logger SHALL NOT log API keys or credentials
5. THE Telemetry_Logger SHALL include a request identifier for correlation across log entries

### Requirement 7: Multi-Turn Context Preservation

**User Story:** As a user, I want the AI to remember previous messages in our conversation, so that I can have a coherent multi-turn dialogue.

#### Acceptance Criteria

1. WHEN a user sends a message, THE Frontend_Client SHALL include all previous messages in the request payload
2. THE Backend_Server SHALL forward the complete Conversation_History to the LLM_Provider
3. FOR ALL conversations with at least 3 user messages, THE LLM_Provider SHALL receive context from all previous turns
4. THE Chat_UI SHALL display all messages in chronological order

### Requirement 8: Backend Server Infrastructure

**User Story:** As a developer, I want a backend server to handle API requests, so that the frontend can communicate with the LLM securely.

#### Acceptance Criteria

1. THE Backend_Server SHALL expose a POST endpoint at /api/chat
2. THE Backend_Server SHALL accept JSON request payloads with a messages array
3. THE Backend_Server SHALL return JSON response payloads with an assistant message
4. THE Backend_Server SHALL use Express or Fastify as the HTTP framework
5. THE Backend_Server SHALL enable CORS for the Frontend_Client origin during development
6. THE Backend_Server SHALL validate incoming request payloads and return 400 errors for invalid requests

### Requirement 9: Chat UI Component

**User Story:** As a user, I want a dedicated chat interface, so that I can interact with the LLM in a conversational format.

#### Acceptance Criteria

1. THE Chat_UI SHALL display a scrollable message list showing all conversation messages
2. THE Chat_UI SHALL provide a text input field for composing new messages
3. THE Chat_UI SHALL provide a send button to submit messages
4. WHEN a user presses Enter in the input field, THE Chat_UI SHALL submit the message
5. WHEN a message is submitted, THE Chat_UI SHALL clear the input field
6. THE Chat_UI SHALL auto-scroll to the latest message when a new message is added
7. THE Chat_UI SHALL be accessible via a route in the React Router configuration

### Requirement 10: OpenAI API Integration

**User Story:** As a developer, I want to integrate the OpenAI API, so that the system can generate intelligent responses.

#### Acceptance Criteria

1. THE Backend_Server SHALL use the official openai npm package to communicate with the LLM_Provider
2. THE Backend_Server SHALL send requests to the OpenAI chat completions endpoint
3. THE Backend_Server SHALL configure the model parameter (e.g., "gpt-4", "gpt-3.5-turbo")
4. WHERE streaming is supported, THE Backend_Server SHALL support streaming responses to the Frontend_Client
5. WHERE streaming is not feasible, THE Backend_Server SHALL return complete responses after generation finishes
6. THE Backend_Server SHALL handle OpenAI API errors (authentication, rate limits, invalid requests) and map them to user-friendly error messages
