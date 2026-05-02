/**
 * Parses a pasted ChatGPT conversation transcript and extracts user messages.
 *
 * Supported formats:
 * 1. Labeled lines — "You:", "User:", "Human:", "Me:", "user-"
 *    Assistant labels — "ChatGPT:", "Assistant:", "GPT:", "AI:"
 * 2. Alternating blank-line-separated blocks (user turn first)
 *
 * Returns a ParseResult — either a list of user messages or a descriptive error.
 */

export type ParseResult =
  | { ok: true; messages: string[] }
  | { ok: false; error: string };

// Matches: You: / User: / Human: / Me: / user- (case-insensitive, start of line)
const USER_LABEL = /^(you|user|human|me)\s*[:\-]/i;
const ASSISTANT_LABEL = /^(chatgpt|assistant|gpt|ai)\s*:/i;

function stripLabel(line: string): string {
  return line.replace(USER_LABEL, "").trim();
}

/** Strategy 1: role-labeled lines */
function parseLabeledFormat(lines: string[]): string[] | null {
  const hasLabels = lines.some(
    (l) => USER_LABEL.test(l) || ASSISTANT_LABEL.test(l),
  );
  if (!hasLabels) return null;

  const messages: string[] = [];
  let currentRole: "user" | "assistant" | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (currentRole === "user" && buffer.length > 0) {
      const text = buffer.join(" ").trim();
      if (text) messages.push(text);
    }
    buffer = [];
  };

  for (const line of lines) {
    if (USER_LABEL.test(line)) {
      flush();
      currentRole = "user";
      const content = stripLabel(line);
      if (content) buffer.push(content);
    } else if (ASSISTANT_LABEL.test(line)) {
      flush();
      currentRole = "assistant";
    } else if (currentRole === "user") {
      buffer.push(line);
    }
    // lines before any label are ignored
  }
  flush();

  return messages.length > 0 ? messages : null;
}

/** Strategy 2: alternating blank-line-separated blocks, user turn first */
function parseAlternatingBlocks(raw: string): string[] | null {
  const blocks = raw
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  if (blocks.length < 2) return null;

  const userBlocks = blocks.filter((_, i) => i % 2 === 0);
  return userBlocks.length > 0 ? userBlocks : null;
}

export function parseConversation(raw: string): ParseResult {
  if (!raw.trim()) {
    return { ok: false, error: "The transcript is empty." };
  }

  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const labeled = parseLabeledFormat(lines);
  if (labeled) return { ok: true, messages: labeled };

  const alternating = parseAlternatingBlocks(raw);
  if (alternating) return { ok: true, messages: alternating };

  return {
    ok: false,
    error:
      "No user messages detected. Try a format like \"You: your message\" or paste the conversation with blank lines between turns.",
  };
}
