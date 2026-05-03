import { parseConversation } from './parser';

// ---------------------------------------------------------------------------
// Config — server proxy URL
// ---------------------------------------------------------------------------

const PROXY_BASE: string = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001';

// ---------------------------------------------------------------------------
// Supported AI platforms
// ---------------------------------------------------------------------------

export type AIPlatform = 'chatgpt' | 'gemini' | 'perplexity';

interface PlatformConfig {
  name: string;
  urlPatterns: RegExp[];
  icon: string;
}

const PLATFORMS: Record<AIPlatform, PlatformConfig> = {
  chatgpt: {
    name: 'ChatGPT',
    urlPatterns: [/^https:\/\/chatgpt\.com\/share\//, /^https:\/\/chat\.openai\.com\/share\//],
    icon: '🤖',
  },
  gemini: {
    name: 'Gemini',
    urlPatterns: [
      /^https:\/\/gemini\.google\.com\/share\//,
      /^https:\/\/gemini\.google\.com\/app\//,
    ],
    icon: '✨',
  },
  perplexity: {
    name: 'Perplexity',
    urlPatterns: [
      /^https:\/\/www\.perplexity\.ai\/search\//,
      /^https:\/\/perplexity\.ai\/search\//,
    ],
    icon: '🔍',
  },
};

// ---------------------------------------------------------------------------
// URL detection
// ---------------------------------------------------------------------------

/**
 * Detects which AI platform a URL belongs to
 */
export function detectPlatform(input: string): AIPlatform | null {
  const trimmed = input.trim();

  for (const [platform, config] of Object.entries(PLATFORMS)) {
    if (config.urlPatterns.some((pattern) => pattern.test(trimmed))) {
      return platform as AIPlatform;
    }
  }

  return null;
}

/**
 * Returns true if the input is a valid AI chat share URL
 */
export function isAIShareUrl(input: string): boolean {
  return detectPlatform(input) !== null;
}

/**
 * Legacy function for backward compatibility
 */
export function isChatGPTShareUrl(input: string): boolean {
  return detectPlatform(input) === 'chatgpt';
}

/**
 * Get platform display name
 */
export function getPlatformName(url: string): string {
  const platform = detectPlatform(url);
  return platform ? PLATFORMS[platform].name : 'AI Chat';
}

// ---------------------------------------------------------------------------
// HTML extraction strategies
// ---------------------------------------------------------------------------

/**
 * Strategy 1: look for embedded JSON state in <script> tags.
 * Most AI chat platforms embed conversation data as JSON.
 */
function extractFromEmbeddedJson(
  html: string
): { messages: string[]; createTime: number | null } | null {
  const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  const candidates: string[] = [];

  while ((match = scriptPattern.exec(html)) !== null) {
    const content = match[1];
    if (
      content.includes('"role"') &&
      (content.includes('"user"') || content.includes('"human"')) &&
      content.includes('"content"')
    ) {
      candidates.push(content);
    }
  }

  if (candidates.length === 0) return null;

  const userMessages: string[] = [];
  let createTime: number | null = null;

  for (const script of candidates) {
    // Try to extract conversation-level create_time
    if (createTime === null) {
      const timeMatch = /"create_time"\s*:\s*(\d+(?:\.\d+)?)/i.exec(script);
      if (timeMatch) {
        createTime = parseFloat(timeMatch[1]);
      }
    }

    // role before content
    const roleContentPattern =
      /"role"\s*:\s*"(user|human)"[\s\S]{0,500}?"content"\s*:\s*"((?:[^"\\]|\\.)*)"/gi;
    let m: RegExpExecArray | null;
    while ((m = roleContentPattern.exec(script)) !== null) {
      const content = decodeJsonString(m[2]);
      if (content.length > 0) userMessages.push(content);
    }

    // content before role
    const contentRolePattern =
      /"content"\s*:\s*"((?:[^"\\]|\\.)*)"[\s\S]{0,500}?"role"\s*:\s*"(user|human)"/gi;
    while ((m = contentRolePattern.exec(script)) !== null) {
      const content = decodeJsonString(m[1]);
      if (content.length > 0 && !userMessages.includes(content)) {
        userMessages.push(content);
      }
    }
  }

  return userMessages.length > 0 ? { messages: userMessages, createTime } : null;
}

function decodeJsonString(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, ' ')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .trim();
}

/**
 * Strategy 2: strip HTML and return readable text for the existing parser.
 */
function extractReadableText(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  text = text.replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');

  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
}

/**
 * Extracts conversation text from raw HTML.
 * Tries structured JSON extraction first, falls back to text stripping.
 * Returns the conversation text and optionally the chat creation timestamp.
 */
export function extractConversationTextFromHtml(html: string): {
  text: string;
  createTime: number | null;
} {
  const jsonResult = extractFromEmbeddedJson(html);
  if (jsonResult && jsonResult.messages.length > 0) {
    return {
      text: jsonResult.messages.map((m) => `You: ${m}`).join('\n\n'),
      createTime: jsonResult.createTime,
    };
  }

  const text = extractReadableText(html);
  if (text.length < 100) {
    throw new Error('EXTRACTION_TOO_SHORT');
  }

  return { text, createTime: null };
}

// ---------------------------------------------------------------------------
// Fetch via our proxy (no CORS issues)
// ---------------------------------------------------------------------------

/**
 * Fetches a shared conversation via the proxy server.
 * The server handles the actual HTTP request server-side, bypassing CORS.
 */
export async function fetchSharedConversation(url: string): Promise<string> {
  if (!isAIShareUrl(url)) {
    throw new Error('INVALID_URL');
  }

  let response: Response;
  try {
    response = await fetch(`${PROXY_BASE}/api/fetch-share?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new Error('SERVER_UNREACHABLE');
  }

  let data: { html?: string; error?: string };
  try {
    data = (await response.json()) as { html?: string; error?: string };
  } catch {
    throw new Error('FETCH_FAILED');
  }

  if (!response.ok || !data.html) {
    throw new Error(data.error ? `SERVER_ERROR:${data.error}` : 'FETCH_FAILED');
  }

  return data.html;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Given a share URL, returns an array of user prompt strings.
 */
export async function getPromptsFromInput(
  input: string
): Promise<{ prompts: string[]; chatCreatedAt: string | null }> {
  const trimmed = input.trim();

  if (isAIShareUrl(trimmed)) {
    const transcript = await fetchSharedConversation(trimmed);
    const prompts = parseConversation(transcript);

    if (prompts.length === 0) {
      throw new Error('NO_PROMPTS_FOUND');
    }

    // Try to extract create_time from the raw HTML if the server returned it
    // The proxy may return pre-formatted text, so createTime extraction happens
    // at the HTML level. We'll attempt to parse it from the transcript response.
    // If the server already extracted it, it won't be in the transcript.
    // For now, return null — the server-side extraction handles this.
    return { prompts, chatCreatedAt: null };
  }

  return { prompts: parseConversation(trimmed), chatCreatedAt: null };
}

/**
 * Fetches and parses a share link, returning prompts and the chat creation time.
 * This is the full pipeline that also extracts timestamps from the HTML.
 */
export async function getPromptsAndTimestamp(
  input: string
): Promise<{ prompts: string[]; chatCreatedAt: string | null }> {
  const trimmed = input.trim();

  if (!isAIShareUrl(trimmed)) {
    throw new Error('INVALID_URL');
  }

  let response: Response;
  try {
    response = await fetch(`${PROXY_BASE}/api/fetch-share?url=${encodeURIComponent(trimmed)}`, {
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new Error('SERVER_UNREACHABLE');
  }

  let data: { html?: string; error?: string };
  try {
    data = (await response.json()) as { html?: string; error?: string };
  } catch {
    throw new Error('FETCH_FAILED');
  }

  if (!response.ok || !data.html) {
    throw new Error(data.error ? `SERVER_ERROR:${data.error}` : 'FETCH_FAILED');
  }

  const { text, createTime } = extractConversationTextFromHtml(data.html);
  const prompts = parseConversation(text);

  if (prompts.length === 0) {
    throw new Error('NO_PROMPTS_FOUND');
  }

  const chatCreatedAt = createTime ? new Date(createTime * 1000).toISOString() : null;

  return { prompts, chatCreatedAt };
}

// ---------------------------------------------------------------------------
// Error message helper
// ---------------------------------------------------------------------------

export function getLinkErrorMessage(errorCode: string): string {
  if (errorCode.startsWith('SERVER_ERROR:')) {
    const detail = errorCode.replace('SERVER_ERROR:', '');
    return `Could not read the shared conversation: ${detail}`;
  }

  switch (errorCode) {
    case 'SERVER_UNREACHABLE':
      return "The AskBetter proxy server isn't running. Please try again later.";
    case 'FETCH_FAILED':
      return "We couldn't fetch that shared conversation. The link may be private or expired.";
    case 'EXTRACTION_TOO_SHORT':
    case 'NO_PROMPTS_FOUND':
      return "We fetched the link but couldn't find any user messages. Some platforms require JavaScript to load — ChatGPT share links work best.";
    case 'INVALID_URL':
      return "That doesn't look like a valid AI chat share link. We support ChatGPT, Gemini, and Perplexity.";
    default:
      return 'Something went wrong reading that link. Please try again.';
  }
}
