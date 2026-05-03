import type {
  ConversationScores,
  AnalyzedPrompt,
  DetectedPattern,
  CognitiveRole,
  ConversationArc,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncatePrompt(text: string, maxLen = 60): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen).trimEnd() + '…' : trimmed;
}

function countByRole(prompts: AnalyzedPrompt[]): Record<CognitiveRole, number> {
  const counts: Record<CognitiveRole, number> = {
    outsourcing: 0,
    directing: 0,
    exploring: 0,
    thinking_aloud: 0,
    stress_testing: 0,
    rubber_stamping: 0,
    iterating: 0,
  };
  for (const p of prompts) counts[p.cognitiveRole]++;
  return counts;
}

// ---------------------------------------------------------------------------
// Summary generation
// Uses cognitive roles, effort tiers, and conversation arc.
// ALWAYS ends with a concrete next-level challenge — no free passes.
// ---------------------------------------------------------------------------

export function generateSummary(
  scores: ConversationScores,
  prompts: AnalyzedPrompt[],
  arc?: ConversationArc
): string {
  const total = prompts.length;
  if (total === 0) {
    return 'No prompts were detected. Try pasting a conversation with clear user messages.';
  }

  const roles = countByRole(prompts);
  const outsourcingRatio = roles.outsourcing / total;
  const exploringRatio = (roles.exploring + roles.thinking_aloud + roles.stress_testing) / total;
  const rubberStampRatio = roles.rubber_stamping / total;

  const lowEffortCount = prompts.filter((p) => p.effortTier === 'low_effort').length;
  const rigorousCount = prompts.filter((p) => p.effortTier === 'rigorous').length;
  const investedCount = prompts.filter((p) => p.effortTier === 'invested').length;

  let body: string;
  let challenge: string;

  // --- Arc context (prepended when relevant) ---
  let arcNote = '';
  if (arc && total >= 3) {
    switch (arc) {
      case 'warming_up':
        arcNote =
          'Your prompts improved as the conversation went on — you started with bare requests but got more thoughtful. ';
        break;
      case 'fading_out':
        arcNote =
          'Your prompts started strong but lost depth toward the end — you may have gotten fatigued or started accepting answers without pushback. ';
        break;
      case 'consistent_explorer':
        arcNote = 'You maintained curiosity throughout the conversation. ';
        break;
      case 'task_then_verify':
        arcNote =
          'You delegated tasks first, then circled back to verify — a "build then check" pattern. ';
        break;
      case 'flat':
        // No arc note for flat — nothing interesting to say
        break;
    }
  }

  // --- Body (the main observation) ---

  // Genuinely strong
  if (exploringRatio >= 0.5 && (rigorousCount + investedCount) / total >= 0.4) {
    const deepRoles = roles.exploring + roles.thinking_aloud + roles.stress_testing;
    body = `${deepRoles} of your ${total} prompts were exploratory, collaborative, or stress-testing — you engaged with ideas rather than just collecting outputs.`;
    challenge = `Next level: ask the AI to find the single biggest flaw in its own answer before you accept it. Most people never do this.`;
  }
  // Heavy outsourcing
  else if (outsourcingRatio >= 0.5) {
    body = `${roles.outsourcing} of your ${total} prompts were outsourcing — bare task handoffs with no context, no constraints, and no learning intent. You used AI as a vending machine: insert request, receive output, move on.`;
    challenge = `Challenge: before your next prompt, write one sentence about what you've already tried or what you think the answer might be. That single sentence changes everything.`;
  }
  // Rubber-stamping dominant
  else if (rubberStampRatio >= 0.3) {
    body = `${roles.rubber_stamping} of your ${total} prompts were rubber-stamping — asking "is this correct?" without specifying what to check or what could go wrong. That's verification theater, not critical thinking.`;
    challenge = `Challenge: replace every "is this correct?" with "what's the weakest part of this and why?" You'll get actual insight instead of a yes/no.`;
  }
  // Mostly low-effort
  else if (lowEffortCount / total >= 0.6) {
    body = `${lowEffortCount} of your ${total} prompts were low-effort — short, vague, or missing any real context. The AI can only be as specific as you are.`;
    challenge = `Challenge: no prompt under 15 words. Add a goal, a constraint, or an example of what good looks like before hitting send.`;
  }
  // Mixed with some directing
  else if (roles.directing >= 2 && outsourcingRatio < 0.4) {
    body = `You directed AI with constraints in ${roles.directing} prompts — that's better than bare delegation. But ${lowEffortCount > 0 ? `${lowEffortCount} prompt${lowEffortCount !== 1 ? 's were' : ' was'} still low-effort` : "there's room to push further"}.`;
    challenge = `Challenge: after every directed task, ask one "why" question — "Why this approach over X?" turns a task into a learning moment.`;
  }
  // Decent iteration
  else if (roles.iterating >= 3) {
    body = `You iterated ${roles.iterating} times — building on previous responses rather than starting fresh. ${outsourcingRatio > 0.2 ? `But ${roles.outsourcing} prompt${roles.outsourcing !== 1 ? 's were' : ' was'} still bare outsourcing.` : ''}`;
    challenge = `Challenge: in your next session, end with a synthesis prompt — "Summarize what we covered and what I should remember." It forces consolidation instead of accumulation.`;
  }
  // Surface-level
  else if (scores.curiosity < 30 && scores.criticalThinking < 30) {
    body = `Your ${total} prompts were transactional — you asked for things and accepted the answers. No pushback, no exploration, no "what if."`;
    challenge = `Challenge: ask one "what would happen if…" question per session. Just one. It's the minimum viable curiosity.`;
  }
  // Mediocre mixed session
  else if (scores.overallQuality < 55) {
    body = `${lowEffortCount} of your ${total} prompts were low-effort. You got answers, but you didn't challenge them, build on them, or connect them to your own thinking. Most common gap: ${getMostCommonMissing(prompts)}.`;
    challenge = `Challenge: pick your weakest prompt from this session and rewrite it with your own thinking first, then a specific question about what you don't understand.`;
  }
  // Decent but not great
  else {
    const deepCount = roles.exploring + roles.thinking_aloud + roles.stress_testing;
    body = `${deepCount} of your ${total} prompts showed real cognitive engagement. The rest were task-oriented — one more follow-up question per exchange would shift the balance.`;
    challenge = `Challenge: ask the AI to evaluate the quality of your questions, not just answer them. "Which of my prompts in this conversation were weakest and why?"`;
  }

  return `${arcNote}${body} ${challenge}`;
}

function getMostCommonMissing(prompts: AnalyzedPrompt[]): string {
  const counts: Record<string, number> = {};
  for (const p of prompts) {
    for (const signal of p.missingSignals) {
      counts[signal] = (counts[signal] || 0) + 1;
    }
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return 'no constraints or context provided';
  return sorted[0][0].toLowerCase();
}

// ---------------------------------------------------------------------------
// Suggestion generation
// Uses cognitive roles, effort tiers, and missing signals for concrete,
// prompt-specific feedback rather than generic dimension advice.
// ---------------------------------------------------------------------------

export function generateSuggestions(
  scores: ConversationScores,
  prompts: AnalyzedPrompt[],
  patterns: DetectedPattern[]
): string[] {
  const suggestions: string[] = [];
  const patternIds = new Set(patterns.map((p) => p.id));
  const total = prompts.length;
  const roles = countByRole(prompts);

  // --- 1. Role-based feedback (most specific, highest priority) ---

  if (roles.outsourcing >= 2) {
    const worst = prompts
      .filter((p) => p.cognitiveRole === 'outsourcing')
      .sort((a, b) => a.qualityScore - b.qualityScore)[0];
    const snippet = worst ? truncatePrompt(worst.text) : '';
    suggestions.push(
      `${roles.outsourcing} of your prompts were pure outsourcing — bare task handoffs.${snippet ? ` Example: "${snippet}".` : ''} Upgrade these by adding one sentence: what you've already tried, what constraint you're working under, or what you want to learn from the result.`
    );
  }

  if (roles.rubber_stamping >= 2) {
    suggestions.push(
      `${roles.rubber_stamping} prompts were rubber-stamping — asking "is this correct?" without depth. Replace "Is this right?" with "What assumptions am I making here?" or "What's the weakest part of this?" You'll get actual insight instead of a yes/no.`
    );
  }

  if (roles.directing >= 2 && roles.exploring === 0 && roles.thinking_aloud === 0) {
    suggestions.push(
      `You directed AI with constraints ${roles.directing} times — that's structured delegation. But you never explored or thought aloud. After getting a directed result, ask one "why" question: "Why this approach over X?" or "What would change if the constraint was different?"`
    );
  }

  // --- 2. Effort-tier feedback ---

  const lowEffortPrompts = prompts.filter((p) => p.effortTier === 'low_effort');
  if (lowEffortPrompts.length >= 2 && suggestions.length < 5) {
    const example = lowEffortPrompts.sort((a, b) => a.wordCount - b.wordCount)[0];
    const snippet = example ? truncatePrompt(example.text) : '';
    suggestions.push(
      `${lowEffortPrompts.length} prompts were low-effort (short, vague, no question).${snippet ? ` Like: "${snippet}".` : ''} Before sending any prompt under 10 words, add: a goal, a constraint, or an example of what good looks like.`
    );
  }

  // --- 3. Missing signals feedback (most common gaps across all prompts) ---

  const missingCounts: Record<string, number> = {};
  for (const p of prompts) {
    for (const signal of p.missingSignals) {
      missingCounts[signal] = (missingCounts[signal] || 0) + 1;
    }
  }
  const sortedMissing = Object.entries(missingCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  for (const [signal, count] of sortedMissing) {
    if (suggestions.length >= 5) break;
    if (count >= Math.ceil(total * 0.4)) {
      suggestions.push(
        `${count} of your ${total} prompts were missing: "${signal}". This is your most common gap — addressing it consistently would improve the quality of every response you get.`
      );
    }
  }

  // --- 4. Pattern-specific suggestions ---

  if (patternIds.has('one_and_done') && suggestions.length < 6) {
    suggestions.push(
      'You sent one message and stopped. That\'s not a conversation — it\'s a search query. After any response, ask at least one follow-up: "Why did you do it that way?", "What are the tradeoffs?", or "What would break this?"'
    );
  }

  if (patternIds.has('fading_out') && suggestions.length < 6) {
    suggestions.push(
      'Your prompts got weaker toward the end of the conversation. If you notice yourself defaulting to "just do it" — pause. That\'s when a single "why?" or "what could go wrong?" matters most.'
    );
  }

  if (patternIds.has('no_followup_questions') && suggestions.length < 6) {
    suggestions.push(
      'You never asked a follow-up question. Accepting every first response without pushback means you\'re trusting the output without understanding it. At minimum, ask "why" once per session.'
    );
  }

  // --- 5. Prompt-specific rewrite (most actionable) ---

  if (suggestions.length < 6) {
    const worstPrompt = prompts
      .filter((p) => p.cognitiveRole === 'outsourcing' || p.cognitiveRole === 'rubber_stamping')
      .sort((a, b) => a.qualityScore - b.qualityScore)[0];

    if (worstPrompt) {
      const snippet = truncatePrompt(worstPrompt.text);
      const missing = worstPrompt.missingSignals[0];
      const rewriteHint = missing ? ` What's missing: ${missing.toLowerCase()}.` : '';
      suggestions.push(
        `Your weakest prompt: "${snippet}".${rewriteHint} Rewrite it with your own thinking first, then a specific question about what you don't understand.`
      );
    }
  }

  // --- 6. Dimension-based suggestions (fill remaining slots) ---

  if (suggestions.length < 6 && scores.curiosity < 40) {
    suggestions.push(
      'You rarely explored ideas. Add one "why" or "what if" per session — it forces the AI to explain, not just produce. Exploring is how you turn outputs into understanding.'
    );
  }

  if (suggestions.length < 6 && scores.criticalThinking < 40) {
    suggestions.push(
      'You didn\'t stress-test answers. Get in the habit of asking: "What could go wrong?", "What are the edge cases?", or "What\'s the strongest argument against this?"'
    );
  }

  if (suggestions.length < 6 && scores.autonomy < 40) {
    suggestions.push(
      "You didn't show your own thinking. Before each prompt, write one sentence: what you already know, what you tried, or what you think the answer might be. It changes the response quality dramatically."
    );
  }

  return suggestions.slice(0, 6);
}
