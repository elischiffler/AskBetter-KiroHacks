import { ValidationError } from './errors.js';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: Message[];
}

const VALID_ROLES = new Set(['system', 'user', 'assistant']);

export function validateChatRequest(body: unknown): ChatRequest {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Request body must be an object');
  }

  const obj = body as Record<string, unknown>;

  if (!Array.isArray(obj['messages'])) {
    throw new ValidationError('messages must be an array');
  }

  const messages = obj['messages'] as unknown[];

  if (messages.length === 0) {
    throw new ValidationError('messages array cannot be empty');
  }

  for (const msg of messages) {
    if (typeof msg !== 'object' || msg === null) {
      throw new ValidationError('Each message must be an object');
    }

    const m = msg as Record<string, unknown>;

    if (!VALID_ROLES.has(m['role'] as string)) {
      throw new ValidationError('Invalid message role');
    }

    if (typeof m['content'] !== 'string' || m['content'].trim() === '') {
      throw new ValidationError('Message content must be a non-empty string');
    }
  }

  return { messages: messages as Message[] };
}
