/**
 * Parses a pasted ChatGPT conversation transcript and extracts user messages.
 *
 * Supports multiple common formats:
 * 1. "You: <message>" or "User: <message>"
 * 2. Alternating lines (odd = user, even = assistant) — fallback
 * 3. Shared ChatGPT export format with role labels
 */
export function parseConversation(raw: string): string[] {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Format 1: explicit "You:" / "User:" / "Human:" labels
  const labeledUserMessages: string[] = [];
  const labelPattern = /^(you|user|human)\s*:/i;
  const assistantPattern = /^(chatgpt|assistant|gpt|ai)\s*:/i;

  let hasLabels = false;
  for (const line of lines) {
    if (labelPattern.test(line) || assistantPattern.test(line)) {
      hasLabels = true;
      break;
    }
  }

  if (hasLabels) {
    let currentRole: "user" | "assistant" | null = null;
    let currentBuffer: string[] = [];

    const flush = () => {
      if (currentRole === "user" && currentBuffer.length > 0) {
        labeledUserMessages.push(currentBuffer.join(" ").trim());
      }
      currentBuffer = [];
    };

    for (const line of lines) {
      if (labelPattern.test(line)) {
        flush();
        currentRole = "user";
        const content = line
          .replace(labelPattern, "")
          .replace(/^:\s*/, "")
          .trim();
        if (content) currentBuffer.push(content);
      } else if (assistantPattern.test(line)) {
        flush();
        currentRole = "assistant";
      } else {
        if (currentRole === "user") currentBuffer.push(line);
      }
    }
    flush();

    if (labeledUserMessages.length > 0) return labeledUserMessages;
  }

  // Format 2: alternating blocks separated by blank lines
  // Try to detect if every other block is a user message
  const blocks = raw
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (blocks.length >= 2) {
    // Assume user starts first (odd-indexed blocks: 0, 2, 4...)
    const userBlocks = blocks.filter((_, i) => i % 2 === 0);
    if (userBlocks.length > 0) return userBlocks;
  }

  // Format 3: fallback — treat the whole thing as one prompt
  return [raw.trim()];
}
