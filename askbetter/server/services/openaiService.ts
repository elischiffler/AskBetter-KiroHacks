import OpenAI from 'openai';
import { OpenAIError } from '../errors.js';
import { withRetry, DEFAULT_RETRY_CONFIG } from '../utils/retry.js';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Lazy initialization - only create client when first needed
let openai: OpenAI | null = null;
let OPENAI_MODEL: string;
let OPENAI_TIMEOUT: number;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    OPENAI_MODEL = process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini';
    OPENAI_TIMEOUT = parseInt(process.env['OPENAI_TIMEOUT'] ?? '30000', 10);
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

export async function createChatCompletion(messages: Message[]): Promise<string> {
  const client = getOpenAIClient(); // Initialize on first use
  
  return withRetry(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT);

    try {
      const response = await client.chat.completions.create(
        { model: OPENAI_MODEL, messages },
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      const content = response.choices[0]?.message?.content;
      if (content == null) {
        throw new OpenAIError('Empty response', 500, 'The AI service returned an empty response. Please try again.');
      }

      return content;
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      // Abort / timeout
      if (
        error instanceof Error &&
        (error.name === 'AbortError' || (error as NodeJS.ErrnoException).code === 'ABORT_ERR')
      ) {
        throw new OpenAIError('Request timeout', 504, 'Request timed out. Please try again.');
      }

      // OpenAI SDK API errors
      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          throw new OpenAIError(
            'Authentication failed',
            500,
            'Service configuration error. Please contact support.',
            'AUTH_ERROR'
          );
        }
        if (error.status === 429) {
          throw new OpenAIError(
            'Rate limited',
            429,
            'Too many requests. Please wait a moment and try again.',
            'RATE_LIMIT'
          );
        }
        if (error.status === 400) {
          throw new OpenAIError(
            'Invalid request',
            400,
            'Invalid request format.',
            'INVALID_REQUEST'
          );
        }
        if (error.status != null && error.status >= 500) {
          throw new OpenAIError(
            'OpenAI server error',
            502,
            'The AI service is temporarily unavailable. Please try again.',
            'SERVICE_ERROR'
          );
        }
      }

      // Re-throw unknown errors as OpenAIError
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new OpenAIError(
        message,
        500,
        'An unexpected error occurred. Please try again.'
      );
    }
  }, DEFAULT_RETRY_CONFIG);
}
