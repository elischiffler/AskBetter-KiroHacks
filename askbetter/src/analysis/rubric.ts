import type { PromptIntent, QualityScores } from "./types";

// ---------------------------------------------------------------------------
// Flag signal lists
// ---------------------------------------------------------------------------

const LEARNING_INTENT_SIGNALS = [
  "explain",
  "why",
  "walk me through",
  "teach me",
  "so i understand",
  "reasoning",
  "rationale",
];

const PRIOR_ATTEMPT_SIGNALS = [
  "i tried",
  "my attempt",
  "here's what i have",
  "here is what i have",
  "i think",
  "my reasoning",
  "i got",
  "i believe",
  "my solution",
  "this is my code",
  "here is my code",
  "here's my code",
];

const REASONING_REQUEST_SIGNALS = [
  "explain your reasoning",
  "why",
  "walk me through",
  "step by step",
  "how did you get",
  "what is the logic",
  "rationale",
  "reasoning",
];

const ALTERNATIVES_SIGNALS = [
  "alternative",
  "another way",
  "compare",
  "tradeoffs",
  "pros and cons",
  "which is better",
  "different approach",
  "options",
];

const RISK_SIGNALS = [
  "what could go wrong",
  "limitations",
  "edge cases",
  "assumptions",
  "risks",
  "counterargument",
  "weaknesses",
  "failure cases",
  "downside",
];

const FOLLOW_UP_SIGNALS = [
  "now",
  "what about",
  "also",
  "can you adjust",
  "instead",
  "then",
  "based on that",
];

const CONTEXT_SIGNALS = [
  "constraints",
  "requirements",
  "audience",
  "format",
  "rubric",
  "example",
  "goal",
  "context",
  "background",
];

const BARE_DELEGATION_PHRASES = [
  "make it better",
  "fix it",
  "do it",
  "make it shorter",
  "make it longer",
  "make it more",
  "make it less",
];

// ---------------------------------------------------------------------------
// Flag detection
// ---------------------------------------------------------------------------

function hasAny(lower: string, signals: string[]): boolean {
  return signals.some((s) => lower.includes(s));
}

/**
 * Detects all quality flags present in a prompt.
 * Returns an array of flag IDs.
 */
export function detectFlags(text: string): string[] {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const flags: string[] = [];

  if (hasAny(lower, LEARNING_INTENT_SIGNALS)) {
    flags.push("delegation_with_learning_intent");
  }
  if (hasAny(lower, PRIOR_ATTEMPT_SIGNALS)) {
    flags.push("shows_prior_attempt");
  }
  if (hasAny(lower, REASONING_REQUEST_SIGNALS)) {
    flags.push("asks_for_reasoning");
  }
  if (hasAny(lower, ALTERNATIVES_SIGNALS)) {
    flags.push("asks_for_alternatives");
  }
  if (hasAny(lower, RISK_SIGNALS)) {
    flags.push("asks_for_risk_or_limitations");
  }
  if (wordCount > 100 && !text.includes("?")) {
    flags.push("copy_paste_without_question");
  }
  if (hasAny(lower, FOLLOW_UP_SIGNALS)) {
    flags.push("follow_up_signal");
  }
  if (hasAny(lower, BARE_DELEGATION_PHRASES)) {
    flags.push("bare_delegation_no_context");
  }

  return flags;
}

// ---------------------------------------------------------------------------
// Rubric scoring
// ---------------------------------------------------------------------------

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/**
 * Scores a single prompt on six quality dimensions using the rubric.
 * @param text       The prompt text
 * @param flags      Pre-computed flags from detectFlags()
 * @param intent     Primary intent of the prompt
 * @param index      Position in the conversation (0-based)
 */
export function scorePromptQuality(
  text: string,
  flags: string[],
  intent: PromptIntent,
  index: number,
): QualityScores {
  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // Baseline
  let autonomy = 50;
  let curiosity = 50;
  let criticalThinking = 50;
  let specificity = 50;
  let context = 50;
  let iteration = index > 0 ? 60 : 30;

  // --- Flag bonuses ---
  if (flags.includes("delegation_with_learning_intent")) {
    autonomy += 10;
    curiosity += 15;
    criticalThinking += 10;
  }
  if (flags.includes("shows_prior_attempt")) {
    autonomy += 25;
    context += 10;
    specificity += 10;
  }
  if (flags.includes("asks_for_reasoning")) {
    curiosity += 20;
    criticalThinking += 10;
  }
  if (flags.includes("asks_for_alternatives")) {
    criticalThinking += 15;
    curiosity += 10;
  }
  if (flags.includes("asks_for_risk_or_limitations")) {
    criticalThinking += 25;
    autonomy += 10;
  }
  if (flags.includes("follow_up_signal")) {
    iteration += 20;
  }

  // --- Intent bonuses ---
  if (intent === "verification") {
    criticalThinking += 15;
  }
  if (intent === "collaborative") {
    autonomy += 10;
    criticalThinking += 10;
  }
  if (intent === "curiosity") {
    curiosity += 15;
  }

  // --- Context/specificity signals ---
  if (
    lower.split(/\s+/).some((w) => CONTEXT_SIGNALS.some((s) => w.includes(s)))
  ) {
    specificity += 20;
    context += 20;
  }

  // --- Word count adjustments ---
  if (wordCount >= 20 && wordCount <= 120) {
    specificity += 10;
  }
  if (wordCount < 6) {
    specificity -= 25;
    context -= 20;
  }
  if (wordCount > 120 && !text.includes("?") && intent === "delegation") {
    curiosity -= 15;
    autonomy -= 10;
  }

  // --- Penalties ---
  if (intent === "delegation" && wordCount < 15) {
    autonomy -= 25;
    curiosity -= 15;
    criticalThinking -= 10;
  }
  if (flags.includes("copy_paste_without_question")) {
    autonomy -= 15;
    curiosity -= 15;
  }
  if (flags.includes("bare_delegation_no_context") && wordCount < 15) {
    specificity -= 25;
    autonomy -= 15;
  }
  // Short prompt with no context signals
  if (
    wordCount < 10 &&
    !flags.includes("shows_prior_attempt") &&
    !flags.includes("asks_for_reasoning")
  ) {
    specificity -= 20;
    context -= 20;
  }

  return {
    autonomy: clamp(autonomy),
    curiosity: clamp(curiosity),
    criticalThinking: clamp(criticalThinking),
    specificity: clamp(specificity),
    context: clamp(context),
    iteration: clamp(iteration),
  };
}

/**
 * Computes the overall quality score for a prompt as the average of all six dimensions.
 */
export function computeQualityScore(q: QualityScores): number {
  return Math.round(
    (q.autonomy +
      q.curiosity +
      q.criticalThinking +
      q.specificity +
      q.context +
      q.iteration) /
      6,
  );
}

// Re-export for use in detectFlags elsewhere
export { CONTEXT_SIGNALS };
