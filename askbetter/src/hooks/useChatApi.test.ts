import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatApi } from './useChatApi';
import type { Message } from '../lib/types';

describe('useChatApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with empty messages, isLoading false, and error null', () => {
    const { result } = renderHook(() => useChatApi());

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sendMessage appends user message then assistant message on success', async () => {
    const assistantMessage: Message = { role: 'assistant', content: 'Hello there!' };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: assistantMessage }),
    } as Response);

    const { result } = renderHook(() => useChatApi());

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toEqual({ role: 'user', content: 'Hi' });
    expect(result.current.messages[1]).toEqual(assistantMessage);
  });

  it('sendMessage sets isLoading true during request and false after', async () => {
    let resolveResponse!: (value: Response) => void;
    const responsePromise = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });

    vi.mocked(fetch).mockReturnValueOnce(responsePromise);

    const { result } = renderHook(() => useChatApi());

    // Start sending — don't await yet
    let sendPromise: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage('Hello');
    });

    // isLoading should be true while the request is in flight
    expect(result.current.isLoading).toBe(true);

    // Resolve the fetch
    await act(async () => {
      resolveResponse({
        ok: true,
        json: async () => ({ message: { role: 'assistant', content: 'Hi' } }),
      } as Response);
      await sendPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('failed fetch sets error and rolls back the optimistic user message', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Service unavailable' }),
    } as Response);

    const { result } = renderHook(() => useChatApi());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    // Messages should be rolled back to empty
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.error).toBe('Service unavailable');
  });

  it('failed fetch with no error body falls back to generic error message', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useChatApi());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.messages).toHaveLength(0);
    expect(result.current.error).toBe('Network error');
  });

  it('clearError resets error to null', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Something went wrong' }),
    } as Response);

    const { result } = renderHook(() => useChatApi());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('resetConversation clears messages array', async () => {
    const assistantMessage: Message = { role: 'assistant', content: 'Hi!' };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: assistantMessage }),
    } as Response);

    const { result } = renderHook(() => useChatApi());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.messages).toHaveLength(2);

    act(() => {
      result.current.resetConversation();
    });

    expect(result.current.messages).toHaveLength(0);
  });

  it('sendMessage does nothing when content is empty or whitespace', async () => {
    const { result } = renderHook(() => useChatApi());

    await act(async () => {
      await result.current.sendMessage('');
      await result.current.sendMessage('   ');
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(0);
  });

  it('sendMessage sends the full updated messages array to the API', async () => {
    const assistantMessage: Message = { role: 'assistant', content: 'Reply' };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ message: assistantMessage }),
    } as Response);

    const { result } = renderHook(() => useChatApi());

    // First message
    await act(async () => {
      await result.current.sendMessage('First');
    });

    // Second message — should include the full conversation history
    await act(async () => {
      await result.current.sendMessage('Second');
    });

    const secondCallBody = JSON.parse(
      (vi.mocked(fetch).mock.calls[1][1] as RequestInit).body as string
    );

    expect(secondCallBody.messages).toHaveLength(3); // user, assistant, user
    expect(secondCallBody.messages[0]).toEqual({ role: 'user', content: 'First' });
    expect(secondCallBody.messages[1]).toEqual(assistantMessage);
    expect(secondCallBody.messages[2]).toEqual({ role: 'user', content: 'Second' });
  });
});
