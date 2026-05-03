import { encodingForModel } from 'js-tiktoken';

export interface TokenEstimate {
  tokens: number;
  fallback: boolean;
}

let encoder: ReturnType<typeof encodingForModel> | null = null;
let initFailed = false;

try {
  encoder = encodingForModel('gpt-4o');
} catch {
  initFailed = true;
}

export function estimateTokens(text: string): TokenEstimate {
  if (initFailed || !encoder) {
    return { tokens: 0, fallback: true };
  }
  if (text.length === 0) {
    return { tokens: 0, fallback: false };
  }
  try {
    const tokenIds = encoder.encode(text);
    return { tokens: tokenIds.length, fallback: false };
  } catch {
    return { tokens: 0, fallback: true };
  }
}

export function isTokenizerAvailable(): boolean {
  return !initFailed && encoder !== null;
}
