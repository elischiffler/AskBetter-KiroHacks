# Requirements Document

## Introduction

The Interactive Groq Chat feature enables users to have real-time, ChatGPT-like conversations with Groq AI through the AskBetter web application. The feature integrates the existing ChatPage component with the backend Groq streaming API to provide an interactive chat experience where users can type messages and receive AI-generated responses that stream token-by-token in real-time.

This feature builds upon existing infrastructure: the ChatPage UI component, the backend `/api/chat/stream` endpoint, and the `chatClient.ts` streaming handler. The requirements focus on ensuring full integration, robust error handling, proper conversation state management, and a polished user experience that matches modern AI chat interfaces.

## Glossary

- **Chat_Interface**: The frontend React component (ChatPage.tsx) that displays the conversation and handles user input
- **Streaming_Client**: The chatClient.ts module that manages Server-Sent Events (SSE) communication with the backend
- **Groq_Proxy**: The Express server endpoint (/api/chat/stream) that forwards chat requests to Groq's API
- **Message_History**: The array of ChatMessage objects representing the full conversation context
- **Token_Stream**: The real-time flow of text chunks from Groq that are displayed incrementally to the user
- **Assistant_Response**: A message with role "assistant" containing AI-generated content
- **User_Message**: A message with role "user" containing the user's input text

## Requirements

### Requirement 1: Chat Route Integration

**User Story:** As a user, I want to access the chat interface from the main application, so that I can start conversations with Groq AI.

#### Acceptance Criteria

1. THE Chat_Interface SHALL be accessible via the `/chat` route in the application router
2. WHEN a user navigates to `/chat`, THE Chat_Interface SHALL render with an empty conversation state
3. THE Chat_Interface SHALL include a navigation button to return to the main analyzer page
4. THE Chat_Interface SHALL maintain its conversation state while the user remains on the `/chat` route

### Requirement 2: Message Submission

**User Story:** As a user, I want to send messages to Groq AI, so that I can ask questions and receive responses.

#### Acceptance Criteria

1. WHEN a user types text into the input field and presses Enter (without Shift), THE Chat_Interface SHALL submit the message
2. WHEN a user clicks the Send button, THE Chat_Interface SHALL submit the message
3. THE Chat_Interface SHALL trim whitespace from user input before submission
4. WHEN the input field is empty or contains only whitespace, THE Chat_Interface SHALL disable the Send button
5. WHEN a message is being streamed, THE Chat_Interface SHALL disable the input field and Send button
6. WHEN a message is submitted, THE Chat_Interface SHALL clear the input field immediately
7. WHEN a message is submitted, THE Chat_Interface SHALL append the user message to the Message_History
8. WHEN a message is submitted, THE Chat_Interface SHALL create an empty Assistant_Response placeholder in the Message_History

### Requirement 3: Real-Time Response Streaming

**User Story:** As a user, I want to see AI responses appear in real-time as they are generated, so that I get immediate feedback like ChatGPT.

#### Acceptance Criteria

1. WHEN the Streaming_Client receives a token event, THE Chat_Interface SHALL append the token text to the current Assistant_Response
2. THE Chat_Interface SHALL update the displayed Assistant_Response incrementally as each token arrives
3. WHEN streaming begins, THE Chat_Interface SHALL display a loading indicator ("…") in the Assistant_Response placeholder
4. WHEN streaming completes successfully, THE Chat_Interface SHALL preserve the complete Assistant_Response in the Message_History
5. THE Chat_Interface SHALL maintain smooth scrolling behavior as tokens are appended to long responses
6. FOR ALL token updates, THE Chat_Interface SHALL update the UI without causing visible flicker or layout shifts

### Requirement 4: Conversation Context Management

**User Story:** As a user, I want the AI to remember our conversation history, so that I can have multi-turn discussions with context awareness.

#### Acceptance Criteria

1. WHEN submitting a new message, THE Streaming_Client SHALL send the complete Message_History to the Groq_Proxy
2. THE Message_History SHALL include all previous User_Message and Assistant_Response pairs in chronological order
3. WHEN a new conversation begins, THE Message_History SHALL start empty
4. THE Chat_Interface SHALL preserve the Message_History for the duration of the user's session on the `/chat` route
5. WHEN the user navigates away from `/chat` and returns, THE Chat_Interface SHALL start with an empty Message_History

### Requirement 5: Error Handling and Recovery

**User Story:** As a user, I want clear error messages when something goes wrong, so that I understand what happened and can try again.

#### Acceptance Criteria

1. WHEN the Streaming_Client receives an error event from the Groq_Proxy, THE Chat_Interface SHALL display the error message to the user
2. WHEN a network request fails, THE Chat_Interface SHALL display a descriptive error message
3. WHEN an error occurs during streaming, THE Chat_Interface SHALL remove the empty Assistant_Response placeholder from the Message_History
4. WHEN an error is displayed, THE Chat_Interface SHALL re-enable the input field and Send button
5. WHEN a new message is submitted after an error, THE Chat_Interface SHALL clear the previous error message
6. IF the Groq_Proxy returns a 401 or 403 status, THE Chat_Interface SHALL display "API authentication failed - please check server configuration"
7. IF the Groq_Proxy returns a 503 status, THE Chat_Interface SHALL display "Chat service is temporarily unavailable"

### Requirement 6: Message Display and Formatting

**User Story:** As a user, I want messages to be clearly formatted and easy to read, so that I can follow the conversation naturally.

#### Acceptance Criteria

1. THE Chat_Interface SHALL display User_Message bubbles aligned to the right with a distinct background color
2. THE Chat_Interface SHALL display Assistant_Response bubbles aligned to the left with a different background color
3. THE Chat_Interface SHALL preserve line breaks and whitespace formatting in message content
4. WHEN the conversation is empty, THE Chat_Interface SHALL display a placeholder message: "Start the conversation by sending a message."
5. THE Chat_Interface SHALL limit message bubble width to 85% of the container width
6. THE Chat_Interface SHALL display messages in chronological order from top to bottom
7. THE Chat_Interface SHALL automatically scroll to show the latest message when new content is added

### Requirement 7: Loading and Streaming States

**User Story:** As a user, I want visual feedback during AI response generation, so that I know the system is working.

#### Acceptance Criteria

1. WHEN a message is submitted, THE Chat_Interface SHALL display a loading spinner icon in the Send button
2. WHILE streaming is in progress, THE Chat_Interface SHALL show "Streaming..." or a loading indicator
3. WHEN streaming completes, THE Chat_Interface SHALL remove all loading indicators
4. WHEN streaming is in progress, THE Chat_Interface SHALL prevent submission of new messages
5. THE Chat_Interface SHALL display the streaming state without blocking the user's ability to read previous messages

### Requirement 8: Backend API Validation and Security

**User Story:** As a system administrator, I want the backend to validate and sanitize chat requests, so that the service is protected from abuse.

#### Acceptance Criteria

1. WHEN the Groq_Proxy receives a request, THE Groq_Proxy SHALL validate that messages is a non-empty array
2. THE Groq_Proxy SHALL reject requests with more than 50 messages
3. THE Groq_Proxy SHALL reject requests where any single message exceeds 4000 characters
4. THE Groq_Proxy SHALL reject requests where total message content exceeds 20000 characters
5. WHEN validation fails, THE Groq_Proxy SHALL return a 400 status with a descriptive error message
6. THE Groq_Proxy SHALL verify that each message has a valid role ("user" or "assistant")
7. THE Groq_Proxy SHALL verify that each message has non-empty string content

### Requirement 9: Streaming Protocol Implementation

**User Story:** As a developer, I want the streaming protocol to be robust and handle edge cases, so that the chat experience is reliable.

#### Acceptance Criteria

1. THE Streaming_Client SHALL parse Server-Sent Events (SSE) with event type and data fields
2. WHEN the Streaming_Client receives an event with type "token", THE Streaming_Client SHALL extract the text field and pass it to the onToken handler
3. WHEN the Streaming_Client receives an event with type "error", THE Streaming_Client SHALL extract the message field and pass it to the onError handler
4. WHEN the Streaming_Client receives an event with type "end", THE Streaming_Client SHALL terminate the stream and resolve successfully
5. THE Streaming_Client SHALL handle incomplete SSE chunks by buffering until a complete event is received
6. WHEN the response stream ends without an "end" event, THE Streaming_Client SHALL complete gracefully
7. IF JSON parsing fails for an SSE data payload, THE Streaming_Client SHALL ignore that chunk and continue processing

### Requirement 10: Groq API Integration

**User Story:** As a system, I want to correctly integrate with Groq's streaming API, so that responses are generated reliably.

#### Acceptance Criteria

1. THE Groq_Proxy SHALL send requests to `https://api.groq.com/openai/v1/chat/completions`
2. THE Groq_Proxy SHALL include the Authorization header with the GROQ_API_KEY from environment variables
3. THE Groq_Proxy SHALL set the model parameter to "llama-3.1-8b-instant"
4. THE Groq_Proxy SHALL set the stream parameter to true
5. THE Groq_Proxy SHALL forward the complete Message_History in the messages field
6. WHEN the GROQ_API_KEY is not configured, THE Groq_Proxy SHALL return a 503 status with error message "GROQ_API_KEY is not configured on the server."
7. THE Groq_Proxy SHALL parse Groq's SSE stream and extract content deltas from `choices[0].delta.content`
8. WHEN Groq returns `[DONE]`, THE Groq_Proxy SHALL send an "end" event to the client

### Requirement 11: Connection Management

**User Story:** As a user, I want the system to handle connection interruptions gracefully, so that I don't lose my place in the conversation.

#### Acceptance Criteria

1. WHEN a user closes the browser tab during streaming, THE Groq_Proxy SHALL abort the upstream Groq request
2. WHEN the client disconnects, THE Groq_Proxy SHALL stop processing the stream and clean up resources
3. THE Groq_Proxy SHALL set appropriate SSE headers: Content-Type, Cache-Control, and Connection
4. THE Streaming_Client SHALL close the response reader when streaming completes or errors occur
5. WHEN an AbortController signal is triggered, THE Groq_Proxy SHALL terminate the request without sending additional events

### Requirement 12: Environment Configuration

**User Story:** As a developer, I want to configure the backend URL via environment variables, so that the app works in different deployment environments.

#### Acceptance Criteria

1. THE Streaming_Client SHALL read the backend base URL from `import.meta.env.VITE_PROXY_URL`
2. WHEN VITE_PROXY_URL is not set, THE Streaming_Client SHALL default to `http://localhost:3001`
3. THE Streaming_Client SHALL construct the full API URL by appending `/api/chat/stream` to the base URL
4. THE Groq_Proxy SHALL read the GROQ_API_KEY from process.env.GROQ_API_KEY
5. THE Groq_Proxy SHALL read the PORT from process.env.PORT with a default of 3001

### Requirement 13: Conversation Clearing

**User Story:** As a user, I want to clear the conversation history, so that I can start a fresh conversation without navigating away.

#### Acceptance Criteria

1. THE Chat_Interface SHALL display a "Clear Conversation" or "New Chat" button in the header area
2. WHEN the user clicks the clear button, THE Chat_Interface SHALL prompt for confirmation with a message like "Clear this conversation? This cannot be undone."
3. WHEN the user confirms, THE Chat_Interface SHALL remove all messages from the Message_History
4. WHEN the user confirms, THE Chat_Interface SHALL reset the conversation to the empty state with the placeholder message
5. WHEN the conversation is empty, THE Chat_Interface SHALL hide or disable the clear button
6. WHEN streaming is in progress, THE Chat_Interface SHALL disable the clear button
7. THE clear button SHALL be visually distinct but not overly prominent (e.g., secondary button style or icon button)

### Requirement 14: User Experience Polish

**User Story:** As a user, I want the chat interface to feel responsive and polished, so that it's pleasant to use.

#### Acceptance Criteria

1. THE Chat_Interface SHALL use a gradient background consistent with the application's design system
2. THE Chat_Interface SHALL display the Send button with an icon (paper plane or send icon)
3. WHEN the Send button is disabled, THE Chat_Interface SHALL use a muted color and "not-allowed" cursor
4. THE Chat_Interface SHALL support Shift+Enter for multi-line input without submitting
5. THE Chat_Interface SHALL use a textarea input with 2 rows minimum height
6. THE Chat_Interface SHALL apply rounded corners and shadows consistent with the application's design language
7. THE Chat_Interface SHALL display a "Back to Analyzer" button with a left arrow icon
