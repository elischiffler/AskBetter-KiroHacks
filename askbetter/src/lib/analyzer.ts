import { classifyPrompt } from "./classifier";
import type {
  AnalyzedPrompt,
  AnalysisResult,
  ConversationScores,
  DetectedPattern,
  CategoryDistribution,
} from "./types";

const CATEGORY_COLORS: Record<string, string> = {
  delegation: "#f87171",
  curiosity: "#60a5fa",
  collaborative: "#34d399",
  verification: "#fbbf24",
};

const CATEGORY_LABELS: Record<string, string> = {
  delegation: "Delegation",
  curiosity: "Curiosity",
  collaborative: "Collaborative",
  verification: "Verification",
};

export function analyzeConversation(rawPrompts: string[]): AnalysisResult {
  // Step 1: classify each prompt
  const prompts: AnalyzedPrompt[] = rawPrompts
    .filter((p) => p.trim().length > 0)
    .map((text) => {
      const category = classifyPrompt(text);
      const isPassive = category === "delegation";
      const isActive =
        category === "curiosity" ||
        category === "collaborative" ||
        category === "verification";
      return {
        text,
        category,
        isPassive,
        isActive,
        wordCount: text.split(/\s+/).filter(Boolean).length,
      };
    });

  const total = prompts.length;
  if (total === 0) {
    return emptyResult();
  }

  // Step 2: count categories
  const counts = {
    delegation: 0,
    curiosity: 0,
    collaborative: 0,
    verification: 0,
  };
  for (const p of prompts) counts[p.category]++;

  const activeCount =
    counts.curiosity + counts.collaborative + counts.verification;

  // Step 3: scores (0–100)
  const scores: ConversationScores = {
    autonomy: Math.round((activeCount / total) * 100),
    curiosity: Math.round((counts.curiosity / total) * 100),
    criticalThinking: Math.round(
      ((counts.verification + counts.collaborative) / total) * 100,
    ),
    engagement: computeEngagement(prompts),
  };

  // Step 4: detect patterns
  const patterns = detectPatterns(prompts, counts, total);

  // Step 5: distribution for chart
  const distribution: CategoryDistribution[] = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: CATEGORY_LABELS[key],
      value,
      color: CATEGORY_COLORS[key],
    }));

  // Step 6: pick examples
  const passiveExamples = prompts.filter((p) => p.isPassive).slice(0, 3);
  const activeExamples = prompts.filter((p) => p.isActive).slice(0, 3);

  // Step 7: generate summary + suggestions
  const { summary, suggestions } = generateInsights(scores, counts, total);

  return {
    prompts,
    scores,
    patterns,
    summary,
    suggestions,
    passiveExamples,
    activeExamples,
    distribution,
  };
}

function computeEngagement(prompts: AnalyzedPrompt[]): number {
  const total = prompts.length;
  if (total === 0) return 0;
  if (total === 1) return 10; // one-and-done

  // Reward longer conversations and active prompts
  const lengthScore = Math.min(total / 10, 1) * 50; // up to 50 pts for length
  const activeRatio = prompts.filter((p) => p.isActive).length / total;
  const activeScore = activeRatio * 50; // up to 50 pts for active ratio

  return Math.round(lengthScore + activeScore);
}

function detectPatterns(
  prompts: AnalyzedPrompt[],
  counts: Record<string, number>,
  total: number,
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  if (total === 1) {
    patterns.push({
      id: "one-and-done",
      label: "One-and-done prompting",
      description: "Only one message was sent. No iteration or follow-up.",
      severity: "warning",
    });
  }

  if (total > 1 && counts.curiosity === 0 && counts.collaborative === 0) {
    patterns.push({
      id: "no-followup",
      label: "No follow-up questions",
      description: "You never asked a follow-up or explored ideas further.",
      severity: "warning",
    });
  }

  const delegationRatio = counts.delegation / total;
  if (delegationRatio > 0.6) {
    patterns.push({
      id: "mostly-delegation",
      label: "Mostly task delegation",
      description: `${Math.round(delegationRatio * 100)}% of your prompts were task requests with no exploration.`,
      severity: "warning",
    });
  }

  // Copy-paste behavior: very long prompts with no question marks
  const longNoQuestion = prompts.filter(
    (p) => p.wordCount > 80 && !p.text.includes("?"),
  );
  if (longNoQuestion.length >= 2) {
    patterns.push({
      id: "copy-paste",
      label: "Possible copy-paste behavior",
      description:
        "Several long prompts had no questions — may indicate pasting content without engaging.",
      severity: "warning",
    });
  }

  if (counts.curiosity / total >= 0.3) {
    patterns.push({
      id: "active-learning",
      label: "Strong active learning",
      description:
        "You asked exploratory questions frequently — great sign of engaged learning.",
      severity: "positive",
    });
  }

  if (counts.verification >= 2) {
    patterns.push({
      id: "good-verification",
      label: "Good use of verification",
      description: "You asked AI to check or review your work multiple times.",
      severity: "positive",
    });
  }

  if (counts.collaborative / total >= 0.25) {
    patterns.push({
      id: "collaborative-thinking",
      label: "Collaborative thinking",
      description:
        "You used AI as a thinking partner, not just a task executor.",
      severity: "positive",
    });
  }

  if (total >= 6 && prompts.filter((p) => p.isActive).length / total >= 0.5) {
    patterns.push({
      id: "deep-engagement",
      label: "Deep engagement",
      description:
        "Long conversation with a high proportion of active, thoughtful prompts.",
      severity: "positive",
    });
  }

  return patterns;
}

function generateInsights(
  scores: ConversationScores,
  counts: Record<string, number>,
  total: number,
): { summary: string; suggestions: string[] } {
  const delegationRatio = counts.delegation / total;
  const suggestions: string[] = [];

  // Summary
  let summary = "";
  if (delegationRatio > 0.7) {
    summary =
      "You used AI mostly as a task executor. To engage more actively, try asking for reasoning, comparing alternatives, or explaining why a solution works.";
  } else if (scores.curiosity < 20 && scores.criticalThinking < 20) {
    summary =
      'Your conversation was functional but surface-level. Pushing deeper with "why" and "what if" questions would make your sessions much more valuable.';
  } else if (scores.autonomy >= 60) {
    summary =
      "You showed strong active engagement — asking questions, exploring ideas, and thinking critically. Keep building on this habit.";
  } else {
    summary =
      "Your conversation had a mix of task delegation and exploration. With a few tweaks, you can shift toward more active, curious engagement.";
  }

  // Suggestions
  if (delegationRatio > 0.5) {
    suggestions.push(
      'After getting an answer, ask "why does this work?" or "what are the tradeoffs?" to deepen your understanding.',
    );
  }
  if (counts.curiosity === 0) {
    suggestions.push(
      'Try starting at least one prompt with "why", "how does", or "what if" to shift from task mode to learning mode.',
    );
  }
  if (counts.verification < 2) {
    suggestions.push(
      'Ask AI to review or critique its own answers: "Is there a better approach?" or "What could go wrong with this?"',
    );
  }
  if (counts.collaborative === 0) {
    suggestions.push(
      'Use AI as a thinking partner: "Help me think through this" or "What would you consider before deciding?"',
    );
  }
  if (total <= 2) {
    suggestions.push(
      "Try iterating — follow up on answers, ask for alternatives, or request a deeper explanation.",
    );
  }

  return { summary, suggestions: suggestions.slice(0, 3) };
}

function emptyResult(): AnalysisResult {
  return {
    prompts: [],
    scores: { autonomy: 0, curiosity: 0, criticalThinking: 0, engagement: 0 },
    patterns: [],
    summary:
      "No prompts were detected. Try pasting a conversation with clear user messages.",
    suggestions: [],
    passiveExamples: [],
    activeExamples: [],
    distribution: [],
  };
}
