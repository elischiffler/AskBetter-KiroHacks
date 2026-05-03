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
// Tone: critical. Always names what went wrong, even in strong sessions.
// ALWAYS includes arc observation and ends with a concrete challenge.
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

  // Detect creative/casual requests
  const isCreative = prompts.some((p) =>
    /\b(write|create|make|generate|compose|draft|design|build|song|poem|story|lyrics|essay|email|letter|script)\b/i.test(
      p.text
    )
  );

  // --- Short conversation summaries (1-4 prompts) ---
  if (total <= 2) {
    if (isCreative) {
      return `This was a short creative request with ${total} prompt${total > 1 ? 's' : ''}. Creative delegation is fine — but you'll get better results by adding specifics: tone, audience, style, length, or examples of what you like. Try iterating on the output with follow-ups like "Make it more emotional" or "Try a completely different approach."`;
    }
    if (total === 1) {
      return `You sent a single prompt with no follow-up. One-shot prompts can work for simple tasks, but you're leaving value on the table. The AI's first response is rarely its best — follow up to refine, challenge, or explore alternatives.`;
    }
  }

  let body: string;
  let challenge: string;

  // --- Arc observation (always critical, always included for 3+ prompts) ---
  let arcNote = '';
  if (arc && total >= 3) {
    switch (arc) {
      case 'warming_up':
        arcNote =
          "Your conversation arc shows you started lazy and only got better partway through — which means your early prompts wasted both your time and the AI's. ";
        break;
      case 'fading_out':
        arcNote =
          "Your conversation arc is concerning: you started with some effort but devolved into bare requests by the end. That's when mistakes slip through unchecked. ";
        break;
      case 'consistent_explorer':
        arcNote = "Your conversation arc was consistent — but consistency alone isn't depth. ";
        break;
      case 'task_then_verify':
        arcNote =
          "Your arc shows delegation first, verification second. That's better than never verifying, but you're still building on answers you didn't question when they first appeared. ";
        break;
      case 'flat':
        arcNote =
          "Your engagement didn't change from start to finish — you never adjusted your approach based on what you were getting back. ";
        break;
    }
  }

  // --- Body (the main critique) ---

  // Even "strong" sessions get criticized
  if (exploringRatio >= 0.5 && (rigorousCount + investedCount) / total >= 0.4) {
    const shallowCount = roles.outsourcing + roles.rubber_stamping;
    body = `You explored ideas in ${roles.exploring + roles.thinking_aloud + roles.stress_testing} of ${total} prompts — but ${shallowCount > 0 ? `${shallowCount} were still shallow handoffs or rubber-stamps. Even one unchallenged answer is a missed opportunity` : 'you never asked the AI to argue against its own conclusions'}. ${rigorousCount} prompt${rigorousCount !== 1 ? 's' : ''} hit rigorous effort — the rest didn't.`;
    challenge = `Challenge for next time: before accepting any AI answer, ask "What's the strongest argument against what you just said?" Do this at least 3 times in your next session.`;
  }
  // Heavy outsourcing
  else if (outsourcingRatio >= 0.5) {
    body = `${roles.outsourcing} of your ${total} prompts were pure outsourcing — you handed off tasks with no context, no constraints, no learning intent, and no follow-up. You treated AI like a search engine that writes essays. The responses you got were generic because your prompts were generic.`;
    challenge = `Challenge for next time: zero prompts under 15 words. Every single prompt must include either what you've already tried, what constraints you're working under, or what you want to understand — not just what you want done.`;
  }
  // Rubber-stamping dominant
  else if (rubberStampRatio >= 0.3) {
    body = `${roles.rubber_stamping} of your ${total} prompts were rubber-stamping — you asked "is this correct?" or "does this look good?" without ever specifying what to check, what could fail, or what assumptions you're making. That's not verification, it's seeking reassurance. AI will almost always say yes.`;
    challenge = `Challenge for next time: ban the phrase "is this correct?" from your vocabulary. Replace it with "What are the three weakest assumptions in this?" every single time.`;
  }
  // Mostly low-effort
  else if (lowEffortCount / total >= 0.6) {
    body = `${lowEffortCount} of your ${total} prompts were low-effort — short, vague, and missing any real context. You gave the AI almost nothing to work with and got generic responses in return. That's not the AI's fault — it's yours. Garbage in, garbage out.`;
    challenge = `Challenge for next time: before hitting send, check — does this prompt have a goal, a constraint, AND a question? If not, it's not ready to send.`;
  }
  // Mixed with some directing
  else if (roles.directing >= 2 && outsourcingRatio < 0.4) {
    body = `You directed AI with constraints in ${roles.directing} prompts, which is better than bare delegation. But you never went deeper — you told AI what to do without ever asking why it chose that approach, what alternatives exist, or what could go wrong. Directing without questioning is just polite outsourcing.`;
    challenge = `Challenge for next time: after every task you delegate, immediately follow up with "Why this approach? What's the main tradeoff?" Don't accept the first answer without understanding it.`;
  }
  // Decent iteration
  else if (roles.iterating >= 3) {
    body = `You iterated ${roles.iterating} times, which shows you didn't just accept the first response. But iteration without depth is just refinement — you adjusted outputs without ever questioning the underlying approach. ${outsourcingRatio > 0.2 ? `And ${roles.outsourcing} prompt${roles.outsourcing !== 1 ? 's were' : ' was'} still bare outsourcing with zero thought behind ${roles.outsourcing !== 1 ? 'them' : 'it'}.` : ''}`;
    challenge = `Challenge for next time: in at least 2 of your follow-ups, ask "What would a completely different approach look like?" instead of just tweaking the same answer.`;
  }
  // Surface-level
  else if (scores.curiosity < 30 && scores.criticalThinking < 30) {
    body = `Your ${total} prompts were entirely transactional. You asked for things, got things, and moved on. Zero curiosity. Zero pushback. Zero "why." You're using AI the way you'd use a calculator — except calculators don't hallucinate, and AI does. Without questioning, you have no way to know if what you got is right.`;
    challenge = `Challenge for next time: ask "why" or "what if" at least once per exchange. Just once. If you can't do that, you're not learning — you're copying.`;
  }
  // Mediocre mixed session
  else if (scores.overallQuality < 55) {
    body = `${lowEffortCount} of your ${total} prompts were low-effort. You got answers but never challenged them, never built on them, never connected them to your own thinking. Your most common gap: ${getMostCommonMissing(prompts)}. That pattern repeated across most of your prompts — it's a habit, not a one-off.`;
    challenge = `Challenge for next time: take your single worst prompt from this session, rewrite it with context and a real question, and use that as your template for every prompt going forward.`;
  }
  // Decent but not great
  else {
    const deepCount = roles.exploring + roles.thinking_aloud + roles.stress_testing;
    const shallowCount = total - deepCount;
    body = `${deepCount} of your ${total} prompts showed cognitive engagement — the other ${shallowCount} were task-oriented with no depth. You know how to ask good questions, you just don't do it consistently. That inconsistency means you're getting thoughtful answers half the time and generic filler the other half.`;
    challenge = `Challenge for next time: no prompt gets sent without a follow-up planned. Before you hit send, know what your next question will be if the answer is good AND if it's bad.`;
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

  // --- Short conversation guard ---
  const isShort = total <= 4;

  // Detect if the conversation is primarily creative/casual
  const isCreative = prompts.some((p) =>
    /\b(write|create|make|generate|compose|draft|design|build|craft|song|poem|story|lyrics|essay|email|letter|script|code|draw|paint|illustrate)\b/i.test(
      p.text
    )
  );

  // =====================================================================
  // SHORT CONVERSATIONS (1-4 prompts): focused, contextual feedback only
  // =====================================================================
  if (isShort) {
    if (total === 1) {
      if (isCreative) {
        suggestions.push(
          'For creative requests, try specifying tone, audience, style, length, or references. "Craft song lyrics in the style of Frank Ocean about heartbreak" gives much better results than a bare request.'
        );
        suggestions.push(
          'After getting the first draft, iterate: "Make the chorus more emotional", "Try a different metaphor in verse 2", or "Give me 3 completely different versions." One follow-up can transform the output.'
        );
      } else {
        suggestions.push(
          'You sent a single prompt with no follow-up. The AI\'s first response is rarely its best — try asking a follow-up like "Can you explain why?" or "What\'s an alternative approach?"'
        );
        suggestions.push(
          "With just one prompt, there's not much to analyze. Try having a back-and-forth: ask a question, then follow up based on the response. That's where the real value is."
        );
      }
    } else {
      // 2-4 prompts
      if (isCreative) {
        suggestions.push(
          `You had ${total} prompts in a creative session. To get even better results, try being more specific about what you liked or didn't like in each iteration — "I like the rhythm but the imagery is too generic" is more useful than "try again."`
        );
      }

      if (roles.outsourcing >= 2) {
        suggestions.push(
          `${roles.outsourcing} of your ${total} prompts were task handoffs. Try adding context to at least one: what you've already tried, what constraints you have, or what "good" looks like to you.`
        );
      }

      suggestions.push(
        `You had ${total} prompts — enough to start a conversation but not enough to go deep. Try extending your next session: ask follow-ups, request alternatives, or challenge the AI's reasoning.`
      );
    }

    return suggestions.slice(0, 4);
  }

  // =====================================================================
  // LONGER CONVERSATIONS (5+ prompts): full analysis
  // =====================================================================

  // --- 1. Role-based feedback ---

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

  // --- 3. Missing signals feedback ---

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
