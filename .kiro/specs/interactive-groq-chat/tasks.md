# Implementation Plan: Interactive Groq Chat

## Overview

This implementation plan converts the Interactive Groq Chat design into discrete coding tasks. The feature integrates the existing ChatPage component with the backend Groq streaming API to provide real-time, ChatGPT-like conversations. Implementation will be done in TypeScript (frontend) and JavaScript (backend), building on the existing React + Express infrastructure.

## Tasks

- [x] 1. Add chat route to application router
  - Open `askbetter/src/App.tsx`
  - Import ChatPage component
  - Add new Route for `/chat` path that renders ChatPage
  - Verify route is accessible and ChatPage renders
  - _Requirements: 1.1, 1.2_

- [x] 2. Enhance chatClient.ts for robust streaming
  - [x] 2.1 Improve error message mapping in chatClient.ts
    - Add HTTP status code to error message mapping (401/403 → "API authentication failed", 503 → "Chat service is temporarily unavailable")
    - Improve error extraction from response JSON
    - Handle network timeout errors with descriptive messages
    - _Requirements: 5.6, 5.7, 12.1, 12.2, 12.3_
  
  - [x] 2.2 Enhance SSE parsing robustness
    - Improve buffer handling for incomplete SSE chunks
    - Add graceful handling when stream ends without "end" event
    - Add silent failure for malformed JSON chunks (ignore and continue)
    - Ensure reader is closed on completion or error
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 3. Implement core ChatPage message submission flow
  - [x] 3.1 Wire up message submission handlers
    - Implement sendMessage function that validates input, clears field, and updates state
    - Add user message to messages array immediately on submit
    - Create empty assistant placeholder message
    - Call streamChatReply with full message history
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 2.7, 2.8_
  
  - [x] 3.2 Implement real-time token streaming display
    - Implement onToken handler that appends tokens to assistant message
    - Update messages state incrementally as tokens arrive
    - Display loading indicator ("…") in empty assistant placeholder
    - Preserve complete assistant response when streaming completes
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [x] 3.3 Add input validation and button state management
    - Disable Send button when input is empty or only whitespace
    - Disable input field and Send button during streaming
    - Trim whitespace from user input before submission
    - _Requirements: 2.4, 2.5_

- [x] 4. Implement error handling and recovery
  - [x] 4.1 Add error display to ChatPage
    - Add error state variable to component
    - Display error message below message list when error occurs
    - Clear error message on next successful submission
    - Style error with red text and subtle background
    - _Requirements: 5.1, 5.2, 5.5_
  
  - [x] 4.2 Implement error recovery logic
    - Remove empty assistant placeholder from messages on error
    - Re-enable input field and Send button after error
    - Ensure state is fully recovered and ready for retry
    - _Requirements: 5.3, 5.4_

- [x] 5. Add conversation clearing functionality
  - [x] 5.1 Add Clear Conversation button to header
    - Add "New Chat" button to ChatPage header area
    - Style as secondary button or icon button (not overly prominent)
    - Hide or disable button when conversation is empty
    - Disable button during streaming
    - _Requirements: 13.1, 13.5, 13.6, 13.7_
  
  - [x] 5.2 Implement confirmation dialog and state reset
    - Show confirmation prompt: "Clear this conversation? This cannot be undone."
    - On confirmation, clear all messages from state
    - Reset to empty state with placeholder message
    - _Requirements: 13.2, 13.3, 13.4_

- [x] 6. Enhance message display and formatting
  - [x] 6.1 Implement message bubble styling
    - Style user messages with right alignment and indigo background
    - Style assistant messages with left alignment and gray background
    - Limit message bubble width to 85% of container
    - Apply rounded corners and proper padding
    - _Requirements: 6.1, 6.2, 6.5_
  
  - [x] 6.2 Add auto-scroll and empty state
    - Implement auto-scroll to latest message when new content added
    - Display placeholder "Start the conversation by sending a message." when empty
    - Preserve line breaks and whitespace in message content
    - Ensure smooth scrolling as tokens append to long responses
    - _Requirements: 6.4, 6.6, 6.7, 3.5, 3.6_

- [x] 7. Implement loading and streaming states
  - [x] 7.1 Add visual loading indicators
    - Display loading spinner in Send button during streaming
    - Show "Streaming..." or loading indicator while streaming in progress
    - Remove all loading indicators when streaming completes
    - Ensure loading states don't block reading previous messages
    - _Requirements: 7.1, 7.2, 7.3, 7.5_
  
  - [x] 7.2 Prevent message submission during streaming
    - Block new message submission while streaming is active
    - Keep input disabled until streaming completes
    - _Requirements: 7.4_

- [x] 8. Add keyboard shortcuts and UX polish
  - [x] 8.1 Implement keyboard navigation
    - Handle Enter key to submit message (without Shift)
    - Handle Shift+Enter to insert newline without submitting
    - Add onKeyDown handler to textarea
    - _Requirements: 2.1, 14.4_
  
  - [x] 8.2 Polish UI elements
    - Add Send icon (paper plane) to Send button using lucide-react
    - Add Back to Analyzer button with left arrow icon
    - Use muted color and "not-allowed" cursor for disabled Send button
    - Set textarea minimum height to 2 rows
    - Apply gradient background consistent with app design
    - _Requirements: 14.1, 14.2, 14.3, 14.5, 14.6, 14.7, 1.3_

- [x] 9. Enhance backend validation and error responses
  - [x] 9.1 Verify backend validation rules
    - Confirm validation for non-empty messages array
    - Confirm rejection of requests with >50 messages
    - Confirm rejection of messages >4000 characters
    - Confirm rejection of total content >20000 characters
    - Confirm validation of role ("user" or "assistant")
    - Confirm validation of non-empty string content
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6, 8.7_
  
  - [x] 9.2 Improve backend error event formatting
    - Ensure error events include descriptive messages
    - Format error events consistently with code and message fields
    - Return 400 status with descriptive message on validation failure
    - _Requirements: 8.5_

- [x] 10. Implement connection management
  - [x] 10.1 Add abort handling to backend
    - Set up AbortController for Groq requests
    - Listen for client disconnect events
    - Abort upstream Groq request when client disconnects
    - Clean up resources on connection close
    - _Requirements: 11.1, 11.2, 11.5_
  
  - [x] 10.2 Verify SSE headers and cleanup
    - Confirm Content-Type, Cache-Control, and Connection headers are set
    - Ensure response reader is closed on completion or error
    - _Requirements: 11.3, 11.4_

- [x] 11. Verify Groq API integration
  - [x] 11.1 Confirm Groq API configuration
    - Verify endpoint is `https://api.groq.com/openai/v1/chat/completions`
    - Verify Authorization header includes GROQ_API_KEY
    - Verify model is set to "llama-3.1-8b-instant"
    - Verify stream parameter is true
    - Verify complete message history is forwarded
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [x] 11.2 Verify Groq response parsing
    - Confirm parsing of SSE stream and content delta extraction
    - Confirm [DONE] triggers "end" event to client
    - Confirm missing GROQ_API_KEY returns 503 with error message
    - _Requirements: 10.7, 10.8, 10.6_

- [x] 12. Verify environment configuration
  - Confirm VITE_PROXY_URL is read from import.meta.env
  - Confirm default to `http://localhost:3001` when not set
  - Confirm full API URL construction (`/api/chat/stream` appended)
  - Confirm backend reads GROQ_API_KEY from process.env
  - Confirm backend reads PORT with default 3001
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 13. Test conversation context management
  - Verify complete message history is sent with each request
  - Verify history includes all user and assistant messages in order
  - Verify new conversations start with empty history
  - Verify history persists during session on /chat route
  - Verify history clears when navigating away and returning
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 14. Final integration testing and polish
  - [x] 14.1 End-to-end flow testing
    - Test complete flow: navigate to /chat → send message → receive streaming response
    - Test multi-turn conversation with context awareness
    - Test error scenarios (invalid API key, network failure, validation errors)
    - Test conversation clearing with confirmation
    - Test navigation away and back (history cleared)
    - _Requirements: All_
  
  - [x] 14.2 Accessibility and responsive testing
    - Verify keyboard navigation works (Tab, Enter, Shift+Enter)
    - Test with screen reader (semantic HTML and aria-labels)
    - Verify color contrast meets WCAG AA standards
    - Test on different screen sizes (desktop focus, basic mobile support)
    - _Requirements: 14.1-14.7_

- [x] 15. Checkpoint - Ensure all tests pass
  - Ensure all manual tests pass
  - Verify no console errors or warnings
  - Test all error scenarios and recovery flows
  - Confirm smooth streaming performance
  - Ask the user if questions arise

## Notes

- All tasks reference specific requirements for traceability
- Implementation uses TypeScript for frontend (React) and JavaScript for backend (Express)
- Existing infrastructure (ChatPage, chatClient.ts, /api/chat/stream) will be enhanced, not rewritten
- No property-based tests needed - this feature focuses on UI interaction and streaming I/O
- Testing will be primarily manual for MVP, with unit tests as future enhancement
- Focus on robust error handling and smooth user experience
- Conversation state is client-side only (no persistence for MVP)
