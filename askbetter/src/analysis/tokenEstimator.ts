import { Tiktoken } from 'js-tiktoken/lite';
import cl100k_base from 'js-tiktoken/ranks/cl100k_base';

export interface TokenEstimate {
  tokens: number;
  fallback: boolean;
}

let encoder: Tiktoken | null = null;
let initFailed = false;

try {
  encoder = new Tiktoken(cl100k_base);
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
