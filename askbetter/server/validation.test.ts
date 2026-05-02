import { describe, it, expect } from 'vitest';
import { validateChatRequest } from './validation.js';
import { ValidationError } from './errors.js';

describe('validateChatRequest', () => {
  it('passes a valid request through unchanged', () => {
    const body = {
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
      ],
    };
    const result = validateChatRequest(body);
    expect(result).toEqual(body);
  });

  it('accepts all valid roles', () => {
    const body = {
      messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Question' },
        { role: 'assistant', content: 'Answer' },
      ],
    };
    expect(() => validateChatRequest(body)).not.toThrow();
  });

  it('throws ValidationError when body is not an object', () => {
    expect(() => validateChatRequest('string')).toThrow(ValidationError);
    expect(() => validateChatRequest(42)).toThrow(ValidationError);
    expect(() => validateChatRequest(null)).toThrow(ValidationError);
    expect(() => validateChatRequest(undefined)).toThrow(ValidationError);
  });

  it('throws with correct message when body is not an object', () => {
    expect(() => validateChatRequest(null)).toThrow('Request body must be an object');
  });

  it('throws ValidationError when messages field is missing', () => {
    expect(() => validateChatRequest({})).toThrow(ValidationError);
    expect(() => validateChatRequest({})).toThrow('messages must be an array');
  });

  it('throws ValidationError when messages is not an array', () => {
    expect(() => validateChatRequest({ messages: 'not an array' })).toThrow(ValidationError);
    expect(() => validateChatRequest({ messages: 'not an array' })).toThrow('messages must be an array');
  });

  it('throws ValidationError when messages array is empty', () => {
    expect(() => validateChatRequest({ messages: [] })).toThrow(ValidationError);
    expect(() => validateChatRequest({ messages: [] })).toThrow('messages array cannot be empty');
  });

  it('throws ValidationError when a message is not an object', () => {
    expect(() => validateChatRequest({ messages: ['not an object'] })).toThrow(ValidationError);
    expect(() => validateChatRequest({ messages: ['not an object'] })).toThrow('Each message must be an object');
  });

  it('throws ValidationError when message role is invalid', () => {
    const body = { messages: [{ role: 'invalid', content: 'Hello' }] };
    expect(() => validateChatRequest(body)).toThrow(ValidationError);
    expect(() => validateChatRequest(body)).toThrow('Invalid message role');
  });

  it('throws ValidationError when message content is empty string', () => {
    const body = { messages: [{ role: 'user', content: '' }] };
    expect(() => validateChatRequest(body)).toThrow(ValidationError);
    expect(() => validateChatRequest(body)).toThrow('Message content must be a non-empty string');
  });

  it('throws ValidationError when message content is whitespace only', () => {
    const body = { messages: [{ role: 'user', content: '   ' }] };
    expect(() => validateChatRequest(body)).toThrow(ValidationError);
    expect(() => validateChatRequest(body)).toThrow('Message content must be a non-empty string');
  });

  it('throws ValidationError when message content is not a string', () => {
    const body = { messages: [{ role: 'user', content: 123 }] };
    expect(() => validateChatRequest(body)).toThrow(ValidationError);
    expect(() => validateChatRequest(body)).toThrow('Message content must be a non-empty string');
  });

  it('validates all messages — throws on second invalid message', () => {
    const body = {
      messages: [
        { role: 'user', content: 'Valid' },
        { role: 'bad-role', content: 'Also valid content' },
      ],
    };
    expect(() => validateChatRequest(body)).toThrow('Invalid message role');
  });
});
