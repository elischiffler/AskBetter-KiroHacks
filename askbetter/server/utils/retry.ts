export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  timeout: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  timeout: 30000,
};

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryable(error: unknown): boolean {
  if (error !== null && typeof error === 'object') {
    const err = error as Record<string, unknown>;

    if (err['code'] === 'ETIMEDOUT' || err['code'] === 'ECONNRESET') {
      return true;
    }

    if (typeof err['status'] === 'number') {
      const status = err['status'];
      if (status === 429) return true;
      if (status >= 500 && status < 600) return true;
    }
  }

  return false;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryable(error) || attempt === config.maxRetries) {
        throw error;
      }

      const delay = config.baseDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  // This line is unreachable but satisfies TypeScript's control flow analysis
  throw new Error('Retry loop exhausted');
}
