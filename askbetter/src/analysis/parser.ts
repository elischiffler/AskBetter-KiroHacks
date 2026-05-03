/**
 * Parses a conversation transcript and extracts user messages.
 *
 * Supported formats:
 * 1. Labeled lines: "You:", "User:", "Human:", "Me:" / "ChatGPT:", "Assistant:", "GPT:", "AI:", "Claude:", "Gemini:", "Grok:", "Perplexity:"
 * 2. Alternating blank-line-separated blocks (user first) — only if blocks look like a real conversation
 * 3. Fallback: treat the whole input as a single prompt (only if short enough)
 */
export function parseConversation(raw: string): string[] {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const userPattern = /^(you|user|human|me)\s*:/i;
  const assistantPattern =
    /^(chatgpt|assistant|gpt|ai|claude|gemini|grok|perplexity|model|bot)\s*:/i;

  // --- Format 1: labeled roles ---
  const hasLabels = lines.some((l) => userPattern.test(l) || assistantPattern.test(l));

  if (hasLabels) {
    const messages: string[] = [];
    let currentRole: 'user' | 'assistant' | null = null;
    let buffer: string[] = [];

    const flush = () => {
      if (currentRole === 'user' && buffer.length > 0) {
        const text = buffer.join(' ').trim();
        if (text.length > 0) messages.push(text);
      }
      buffer = [];
    };

    for (const line of lines) {
      if (userPattern.test(line)) {
        flush();
        currentRole = 'user';
        const content = line.replace(userPattern, '').replace(/^:\s*/, '').trim();
        if (content) buffer.push(content);
      } else if (assistantPattern.test(line)) {
        flush();
        currentRole = 'assistant';
      } else if (currentRole === 'user') {
        buffer.push(line);
      }
    }
    flush();

    if (messages.length > 0) return messages;
  }

  // --- Format 2: alternating blank-line-separated blocks ---
  // Only use this if the text has a reasonable number of blocks
  // and looks like a real conversation (not a scraped web page)
  const blocks = raw
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  if (blocks.length >= 2 && blocks.length <= 40) {
    // Sanity check: blocks should be reasonable length (not single words or huge HTML dumps)
    const reasonableBlocks = blocks.filter((b) => b.length > 5 && b.length < 5000);
    if (reasonableBlocks.length === blocks.length) {
      const userBlocks = blocks.filter((_, i) => i % 2 === 0);
      if (userBlocks.length > 0 && userBlocks.length <= 20) return userBlocks;
    }
  }

  // --- Format 3: fallback — only for short inputs that look like a single prompt ---
  const trimmed = raw.trim();
  if (trimmed.length > 0 && trimmed.length < 2000) {
    return [trimmed];
  }

  // If the input is very long and unstructured, return empty
  // (likely a scraped web page, not a conversation)
  return [];
}
