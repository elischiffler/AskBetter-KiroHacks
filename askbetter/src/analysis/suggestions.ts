import type { ConversationScores, AnalyzedPrompt } from "./types";

// ---------------------------------------------------------------------------
// Summary generation
// ---------------------------------------------------------------------------

export function generateSummary(
  scores: ConversationScores,
  prompts: AnalyzedPrompt[],
): string {
  const total = prompts.length;
  if (total === 0) {
    return "No prompts were detected. Try pasting a conversation with clear user messages.";
  }

  const delegationCount = prompts.filter(
    (p) => p.primaryIntent === "delegation",
  ).length;
  const delegationRatio = delegationCount / total;

  const learningDelegationCount = prompts.filter((p) =>
    p.flags.includes("delegation_with_learning_intent"),
  ).length;

  const isHighQualityDelegation =
    delegationRatio > 0.5 && learningDelegationCount / delegationCount >= 0.4;

  if (scores.autonomy >= 65 && scores.curiosity >= 50) {
    return "You used AI as a thinking partner by asking for explanations, alternatives, verification, and critique. This is a strong, active way to learn and work.";
  }

  if (isHighQualityDelegation) {
    return "You delegated several tasks, but many prompts included useful context, constraints, or learning intent. This is a strong way to use AI productively.";
  }

  if (delegationRatio > 0.7) {
    return "You used AI mostly as a task executor. Try adding your own attempt, asking for reasoning, or requesting alternatives to turn task prompts into learning prompts.";
  }

  if (scores.curiosity < 30 && scores.criticalThinking < 30) {
    return 'Your conversation was functional but surface-level. Pushing deeper with "why" and "what if" questions would make your sessions much more valuable.';
  }

  return "Your conversation mixed task completion with some active learning. A few more follow-up questions and requests for reasoning would make it stronger.";
}

// ---------------------------------------------------------------------------
// Suggestion generation — driven by weakest dimensions
// ---------------------------------------------------------------------------

interface DimensionScore {
  key: keyof ConversationScores;
  score: number;
}

export function generateSuggestions(scores: ConversationScores): string[] {
  const dimensions: DimensionScore[] = [
    { key: "curiosity", score: scores.curiosity },
    { key: "criticalThinking", score: scores.criticalThinking },
    { key: "autonomy", score: scores.autonomy },
    { key: "specificity", score: scores.specificity },
    { key: "engagement", score: scores.engagement },
  ];

  // Sort weakest first
  const sorted = [...dimensions].sort((a, b) => a.score - b.score);
  const suggestions: string[] = [];

  for (const dim of sorted) {
    if (suggestions.length >= 3) break;

    switch (dim.key) {
      case "curiosity":
        if (dim.score < 55) {
          suggestions.push(
            'Ask "why does this work?", "how does this actually happen?", or "what if we changed X?" to shift from task mode into learning mode.',
          );
        }
        break;
      case "criticalThinking":
        if (dim.score < 55) {
          suggestions.push(
            'Push AI to think harder: "What assumptions are you making?", "What are the edge cases?", or "What could go wrong with this approach?"',
          );
        }
        break;
      case "autonomy":
        if (dim.score < 55) {
          suggestions.push(
            'Share your own attempt or reasoning before asking for help: "Here\'s what I tried… where did I go wrong?" This builds understanding instead of just getting answers.',
          );
        }
        break;
      case "specificity":
        if (dim.score < 55) {
          suggestions.push(
            "Add more context to your prompts: specify your goal, audience, constraints, format, or an example of what good looks like.",
          );
        }
        break;
      case "engagement":
        if (dim.score < 55) {
          suggestions.push(
            "Try iterating on answers: ask for alternatives, request a deeper explanation, or compare two approaches instead of accepting the first response.",
          );
        }
        break;
    }
  }

  // Fallback if all scores are high
  if (suggestions.length === 0) {
    suggestions.push(
      "Strong conversation overall. Keep asking for reasoning, alternatives, and critique to maintain this level of engagement.",
    );
  }

  return suggestions;
}
