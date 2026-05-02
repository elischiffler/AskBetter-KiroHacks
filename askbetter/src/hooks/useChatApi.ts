import { useState, useCallback, useRef } from 'react';
import type { Message } from '../lib/types';

interface UseChatApiOptions {
  initialMessages?: Message[];
}

interface UseChatApiReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearError: () => void;
  resetConversation: () => void;
}

export function useChatApi(options: UseChatApiOptions = {}): UseChatApiReturn {
  const [messages, setMessages] = useState<Message[]>(options.initialMessages ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use a ref to capture the pre-send messages for rollback, avoiding stale closure issues
  const preSendMessagesRef = useRef<Message[]>([]);

  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!content.trim()) {
      return;
    }

    const userMessage: Message = { role: 'user', content };

    // Capture current messages for rollback before the state update
    preSendMessagesRef.current = messages;

    const updatedMessages = [...messages, userMessage];

    // Optimistically add the user message
    setMessages(updatedMessages);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? 'Request failed');
      }

      const data: { message: Message } = await response.json();
      setMessages([...updatedMessages, data.message]);
    } catch (err) {
      // Roll back to the pre-send messages
      setMessages(preSendMessagesRef.current);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  const resetConversation = useCallback((): void => {
    setMessages([]);
  }, []);

  return { messages, isLoading, error, sendMessage, clearError, resetConversation };
}
