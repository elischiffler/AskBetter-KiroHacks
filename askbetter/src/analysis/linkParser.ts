import { parseConversation } from "./parser";

// ---------------------------------------------------------------------------
// Config — server proxy URL
// ---------------------------------------------------------------------------

// Vite exposes env vars prefixed with VITE_ via import.meta.env
// Falls back to localhost:3001 for local development
const PROXY_BASE: string =
  import.meta.env.VITE_PROXY_URL || "http://localhost:3001";

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
    trimmed.startsWith("https://chatgpt.com/share/") ||
    trimmed.startsWith("https://chat.openai.com/share/")
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
function extractFromEmbeddedJson(html: string): string[] | null {
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

  for (const script of candidates) {
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

  return userMessages.length > 0 ? userMessages : null;
}

function decodeJsonString(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, " ")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .trim();
}

/**
 * Strategy 2: strip HTML and return readable text for the existing parser.
 */
function extractReadableText(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  text = text.replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<[^>]+>/g, "");

  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

/**
 * Extracts conversation text from raw HTML.
 * Tries structured JSON extraction first, falls back to text stripping.
 */
export function extractConversationTextFromHtml(html: string): string {
  const jsonMessages = extractFromEmbeddedJson(html);
  if (jsonMessages && jsonMessages.length > 0) {
    return jsonMessages.map((m) => `You: ${m}`).join("\n\n");
  }

  const text = extractReadableText(html);
  if (text.length < 100) {
    throw new Error("EXTRACTION_TOO_SHORT");
  }

  return text;
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
    throw new Error("INVALID_URL");
  }

  let response: Response;
  try {
    response = await fetch(
      `${PROXY_BASE}/api/fetch-share?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(15_000) },
    );
  } catch {
    throw new Error("SERVER_UNREACHABLE");
  }

  let data: { html?: string; error?: string };
  try {
    data = (await response.json()) as { html?: string; error?: string };
  } catch {
    throw new Error("FETCH_FAILED");
  }

  if (!response.ok || !data.html) {
    // Surface the server's error message if available
    throw new Error(data.error ? `SERVER_ERROR:${data.error}` : "FETCH_FAILED");
  }

  return data.html;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Given any user input (URL or raw transcript), returns an array of user
 * prompt strings ready to pass to analyzeConversation().
 */
export async function getPromptsFromInput(input: string): Promise<string[]> {
  const trimmed = input.trim();

  if (isChatGPTShareUrl(trimmed)) {
    const html = await fetchSharedConversation(trimmed);
    const conversationText = extractConversationTextFromHtml(html);
    const prompts = parseConversation(conversationText);

    if (prompts.length === 0) {
      throw new Error("NO_PROMPTS_FOUND");
    }

    return prompts;
  }

  return parseConversation(trimmed);
}

// ---------------------------------------------------------------------------
// Error message helper
// ---------------------------------------------------------------------------

export function getLinkErrorMessage(errorCode: string): string {
  if (errorCode.startsWith("SERVER_ERROR:")) {
    const detail = errorCode.replace("SERVER_ERROR:", "");
    return `Could not read the shared conversation: ${detail} Please open the link, copy the conversation text, and paste it here instead.`;
  }

  switch (errorCode) {
    case "SERVER_UNREACHABLE":
      return "The AskBetter proxy server isn't running. Start it with: cd server && npm start — then try again.";
    case "FETCH_FAILED":
      return "We couldn't fetch that shared conversation. The link may be private or expired. Try opening it and pasting the text directly.";
    case "EXTRACTION_TOO_SHORT":
    case "NO_PROMPTS_FOUND":
      return "We fetched the link but couldn't extract the conversation messages. Open the link, copy the conversation text, and paste it here instead.";
    case "INVALID_URL":
      return "That doesn't look like a valid ChatGPT share link. Paste the full URL starting with https://chatgpt.com/share/ or paste the conversation transcript directly.";
    default:
      return "Something went wrong reading that link. Please paste the conversation transcript directly instead.";
  }
}
