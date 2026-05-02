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

export async function streamChatReply(messages: ChatMessage[], handlers: StreamHandlers) {
  const response = await fetch(`${PROXY_BASE}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {}
    throw new Error(message);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response stream was returned from the server.');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = 'message';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || '';

    for (const rawChunk of chunks) {
      const lines = rawChunk.split('\n');
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
}
