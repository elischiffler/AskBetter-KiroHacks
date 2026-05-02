export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  requestId: string;
  message: string;
  context?: Record<string, unknown>;
}

const SENSITIVE_KEYS = new Set(['apikey', 'api_key', 'authorization', 'token', 'secret', 'password']);

export function sanitizeForLogging(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function log(
  level: 'info' | 'warn' | 'error',
  requestId: string,
  message: string,
  context?: Record<string, unknown>
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    requestId,
    message,
    ...(context !== undefined
      ? { context: sanitizeForLogging(context) }
      : {}),
  };

  console.log(JSON.stringify(entry));
}

export const logger = {
  info(requestId: string, message: string, context?: Record<string, unknown>): void {
    log('info', requestId, message, context);
  },
  warn(requestId: string, message: string, context?: Record<string, unknown>): void {
    log('warn', requestId, message, context);
  },
  error(requestId: string, message: string, context?: Record<string, unknown>): void {
    log('error', requestId, message, context);
  },
};
