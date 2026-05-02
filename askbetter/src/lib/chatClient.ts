export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

const PROXY_BASE: string = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001';

interface StreamHandlers {
  onToken: (text: string) => void;
  onError?: (message: string) => void;
}

function getErrorMessageForStatus(status: number, defaultMessage: string): string {
  switch (status) {
    case 401:
    case 403:
      return 'API authentication failed - please check server configuration';
    case 503:
      return 'Chat service is temporarily unavailable';
    case 429:
      return 'Too many requests - please wait a moment';
    case 400:
      return defaultMessage || 'Invalid request - please check your input';
    default:
      if (status >= 500) {
        return 'AI service error - please try again';
      }
      return defaultMessage || `Request failed with status ${status}`;
  }
}

export async function streamChatReply(messages: ChatMessage[], handlers: StreamHandlers) {
  try {
    const response = await fetch(`${PROXY_BASE}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      let errorMessage = '';
      try {
        const data = (await response.json()) as { error?: string };
        errorMessage = data.error || '';
      } catch {
        // Failed to parse error response
      }
      
      const message = getErrorMessageForStatus(response.status, errorMessage);
      throw new Error(message);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response stream was returned from the server.');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = 'message';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split(/\r?\n\r?\n/);
        buffer = chunks.pop() || '';

        for (const rawChunk of chunks) {
          const lines = rawChunk.split(/\r?\n/);
          let payload: unknown = null;

          for (const line of lines) {
            if (line.startsWith('event:')) {
              currentEvent = line.slice(6).trim();
            }
            if (line.startsWith('data:')) {
              const json = line.slice(5).trim();
              try {
                payload = JSON.parse(json);
              } catch {
                // Ignore malformed JSON chunks and continue
                payload = null;
              }
            }
          }

          if (currentEvent === 'token') {
            const text = (payload as { text?: string } | null)?.text;
            if (typeof text === 'string' && text.length > 0) {
              handlers.onToken(text);
            }
          }

          if (currentEvent === 'error') {
            const message = (payload as { message?: string } | null)?.message;
            handlers.onError?.(message || 'Unknown streaming error.');
          }

          if (currentEvent === 'end') {
            return;
          }
        }
      }
    } finally {
      // Ensure reader is always closed
      reader.releaseLock();
    }
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error - please check your connection');
    }
    throw error;
  }
}
