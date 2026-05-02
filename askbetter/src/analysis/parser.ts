/**
 * Parses a pasted ChatGPT conversation transcript and extracts user messages.
 *
 * Supported formats:
 * 1. Labeled lines: "You:", "User:", "Human:" / "ChatGPT:", "Assistant:", "GPT:", "AI:"
 * 2. Alternating blank-line-separated blocks (user first)
 * 3. Fallback: treat the whole input as a single prompt
 */
export function parseConversation(raw: string): string[] {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const userPattern = /^(you|user|human)\s*:/i;
  const assistantPattern = /^(chatgpt|assistant|gpt|ai)\s*:/i;

  // --- Format 1: labeled roles ---
  const hasLabels = lines.some((l) => userPattern.test(l) || assistantPattern.test(l));

  if (hasLabels) {
    const messages: string[] = [];
    let currentRole: 'user' | 'assistant' | null = null;
    let buffer: string[] = [];

    const flush = () => {
      if (currentRole === 'user' && buffer.length > 0) {
        messages.push(buffer.join(' ').trim());
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
  const blocks = raw
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  if (blocks.length >= 2) {
    const userBlocks = blocks.filter((_, i) => i % 2 === 0);
    if (userBlocks.length > 0) return userBlocks;
  }

  // --- Format 3: fallback ---
  return [raw.trim()];
}
