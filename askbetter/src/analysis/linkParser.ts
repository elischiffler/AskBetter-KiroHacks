import { parseConversation } from './parser';

// ---------------------------------------------------------------------------
// Config — server proxy URL
// ---------------------------------------------------------------------------

// Vite exposes env vars prefixed with VITE_ via import.meta.env
// Falls back to localhost:3001 for local development
const PROXY_BASE: string = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001';

// ---------------------------------------------------------------------------
// URL detection
// ---------------------------------------------------------------------------

/**
 * Returns true if the input is a valid ChatGPT shared conversation URL.
 * Only accepts HTTPS links to chatgpt.com or chat.openai.com with /share/ path.
 */
export function isChatGPTShareUrl(input: string): boolean {
  const trimmed = input.trim();
  return (
    trimmed.startsWith('https://chatgpt.com/share/') ||
    trimmed.startsWith('https://chat.openai.com/share/')
  );
}

// ---------------------------------------------------------------------------
// HTML extraction strategies
// ---------------------------------------------------------------------------

/**
 * Strategy 1: look for embedded JSON state in <script> tags.
 * ChatGPT shared pages embed conversation data as JSON (Next.js __NEXT_DATA__
 * or similar). We search for message objects with role + content fields.
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
// Fetch via our Express proxy (no CORS issues)
// ---------------------------------------------------------------------------

/**
 * Fetches a ChatGPT shared conversation via the local Express proxy server.
 * The server handles the actual HTTP request server-side, bypassing CORS.
 */
export async function fetchSharedConversation(url: string): Promise<string> {
  if (!isChatGPTShareUrl(url)) {
    throw new Error('INVALID_URL');
  }

  let response: Response;
  try {
    response = await fetch(`${PROXY_BASE}/api/fetch-share?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(30_000),
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
    // Surface the server's error message if available
    throw new Error(data.error ? `SERVER_ERROR:${data.error}` : 'FETCH_FAILED');
  }

  // The server returns either a pre-formatted "You: ..." transcript
  // (from Puppeteer DOM extraction) or raw HTML as fallback.
  return data.html;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Given any user input (URL or raw transcript), returns an array of user
 * prompt strings ready to pass to analyzeConversation(), plus the original
 * chat creation timestamp if available (from share links).
 */
export async function getPromptsFromInput(
  input: string
): Promise<{ prompts: string[]; chatCreatedAt: string | null }> {
  const trimmed = input.trim();

  if (isChatGPTShareUrl(trimmed)) {
    // Server returns a pre-formatted "You: ..." transcript from Puppeteer DOM extraction
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

  if (!isChatGPTShareUrl(trimmed)) {
    return { prompts: parseConversation(trimmed), chatCreatedAt: null };
  }

  if (!isChatGPTShareUrl(trimmed)) {
    throw new Error('INVALID_URL');
  }

  let response: Response;
  try {
    response = await fetch(`${PROXY_BASE}/api/fetch-share?url=${encodeURIComponent(trimmed)}`, {
      signal: AbortSignal.timeout(30_000),
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

  const html = data.html;

  // Try to extract from embedded JSON (includes create_time)
  const { text, createTime } = extractConversationTextFromHtml(html);
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
    return `Could not read the shared conversation: ${detail} Please open the link, copy the conversation text, and paste it here instead.`;
  }

  switch (errorCode) {
    case 'SERVER_UNREACHABLE':
      return "The AskBetter proxy server isn't running. Start it with: cd server && npm start — then try again.";
    case 'FETCH_FAILED':
      return "We couldn't fetch that shared conversation. The link may be private or expired. Try opening it and pasting the text directly.";
    case 'EXTRACTION_TOO_SHORT':
    case 'NO_PROMPTS_FOUND':
      return "We fetched the link but couldn't extract the conversation messages. Open the link, copy the conversation text, and paste it here instead.";
    case 'INVALID_URL':
      return "That doesn't look like a valid ChatGPT share link. Paste the full URL starting with https://chatgpt.com/share/ or paste the conversation transcript directly.";
    default:
      return 'Something went wrong reading that link. Please paste the conversation transcript directly instead.';
  }
}
