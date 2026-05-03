import { scoreIntents, primaryIntentFrom } from './classifier';
import { detectFlags, scorePromptQuality, computeQualityScore } from './rubric';
import { detectPatterns } from './patterns';
import { generateSummary, generateSuggestions } from './suggestions';
import { estimateTokens } from './tokenEstimator';
import { calculateCost } from './costCalculator';
import { TOKEN_CONFIG } from './tokenConfig';
import type {
  AnalyzedPrompt,
  AnalysisResult,
  ConversationScores,
  ConversationArc,
  CategoryDistribution,
  CognitiveRole,
  EffortTier,
  PromptIntent,
  TokenBreakdownEntry,
} from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  delegation: '#f87171',
  curiosity: '#60a5fa',
  collaborative: '#34d399',
  verification: '#fbbf24',
};

const CATEGORY_LABELS: Record<string, string> = {
  delegation: 'Delegation',
  curiosity: 'Curiosity',
  collaborative: 'Collaborative',
  verification: 'Verification',
};

// ---------------------------------------------------------------------------
// Cognitive role classification
// ---------------------------------------------------------------------------

function classifyCognitiveRole(
  intent: PromptIntent,
  flags: string[],
  qualityScores: { specificity: number; context: number },
  index: number
): CognitiveRole {
  const hasLearningIntent = flags.includes('delegation_with_learning_intent');
  const hasPriorAttempt = flags.includes('shows_prior_attempt');
  const asksReasoning = flags.includes('asks_for_reasoning');
  const asksRisks = flags.includes('asks_for_risk_or_limitations');
  const asksAlternatives = flags.includes('asks_for_alternatives');
  const isFollowUp = flags.includes('follow_up_signal');
  const highSpecificity = qualityScores.specificity >= 60;
  const highContext = qualityScores.context >= 60;

  // Iterating: follow-up that builds on previous exchange
  if (index > 0 && isFollowUp) {
    return 'iterating';
  }

  // Thinking aloud: collaborative + shows own reasoning
  if (intent === 'collaborative' && (hasPriorAttempt || hasLearningIntent)) {
    return 'thinking_aloud';
  }

  // Stress-testing: verification with depth
  if (
    (intent === 'verification' && (asksRisks || asksReasoning)) ||
    (asksRisks && asksAlternatives)
  ) {
    return 'stress_testing';
  }

  // Rubber-stamping: verification without depth
  if (intent === 'verification') {
    return 'rubber_stamping';
  }

  // Exploring: curiosity-driven
  if (intent === 'curiosity') {
    return 'exploring';
  }

  // Collaborative without prior attempt is still thinking aloud
  if (intent === 'collaborative') {
    return 'thinking_aloud';
  }

  // Directing: delegation with high specificity/context
  if (intent === 'delegation' && (highSpecificity || highContext || hasLearningIntent)) {
    return 'directing';
  }

  // Outsourcing: bare delegation
  return 'outsourcing';
}

// ---------------------------------------------------------------------------
// Effort tier classification
// ---------------------------------------------------------------------------

function classifyEffortTier(flags: string[], wordCount: number): EffortTier {
  const hasPriorAttempt = flags.includes('shows_prior_attempt');
  const asksReasoning = flags.includes('asks_for_reasoning');
  const asksRisks = flags.includes('asks_for_risk_or_limitations');
  const asksAlternatives = flags.includes('asks_for_alternatives');
  const hasLearningIntent = flags.includes('delegation_with_learning_intent');
  const isBare = flags.includes('bare_delegation_no_context');
  const isCopyPaste = flags.includes('copy_paste_without_question');

  // Count "invested" signals
  const investedSignals = [hasPriorAttempt, asksReasoning, asksRisks, asksAlternatives].filter(
    Boolean
  ).length;

  // Rigorous: multiple quality signals combined
  if (investedSignals >= 2) {
    return 'rigorous';
  }

  // Invested: shows own thinking or asks for reasoning
  if (hasPriorAttempt || asksReasoning || asksRisks || asksAlternatives) {
    return 'invested';
  }

  // Structured: has learning intent or reasonable length with content
  if (hasLearningIntent || (wordCount >= 20 && !isCopyPaste)) {
    return 'structured';
  }

  // Low-effort: short, bare, or copy-paste without question
  if (isBare || isCopyPaste || wordCount < 10) {
    return 'low_effort';
  }

  return 'structured';
}

// ---------------------------------------------------------------------------
// Missing signals detection
// ---------------------------------------------------------------------------

function detectMissingSignals(
  text: string,
  flags: string[],
  intent: PromptIntent,
  wordCount: number
): string[] {
  const missing: string[] = [];

  // Only suggest what's relevant to the prompt type
  if (intent === 'delegation' || intent === 'collaborative') {
    if (!flags.includes('shows_prior_attempt')) {
      missing.push("Doesn't show what you've already tried or thought");
    }
    if (!flags.includes('delegation_with_learning_intent') && intent === 'delegation') {
      missing.push("Doesn't ask for explanation alongside the task");
    }
  }

  if (intent === 'verification') {
    if (!flags.includes('asks_for_risk_or_limitations')) {
      missing.push("Doesn't ask what could go wrong or what assumptions are being made");
    }
    if (!flags.includes('asks_for_reasoning')) {
      missing.push("Doesn't ask for reasoning behind the verdict");
    }
  }

  if (intent === 'curiosity') {
    if (!flags.includes('asks_for_alternatives')) {
      missing.push("Doesn't ask for alternative approaches or perspectives");
    }
  }

  // Universal signals
  if (wordCount < 15 && !text.includes('?')) {
    missing.push('No question asked — unclear what specific answer you need');
  }

  // Context/specificity gaps
  const lower = text.toLowerCase();
  const hasConstraints =
    lower.includes('constraint') ||
    lower.includes('requirement') ||
    lower.includes('must') ||
    lower.includes('needs to');
  const hasAudience =
    lower.includes('audience') || lower.includes('for a') || lower.includes('for my');
  const hasFormat =
    lower.includes('format') || lower.includes('as a list') || lower.includes('in bullet');

  if (!hasConstraints && !hasAudience && !hasFormat && wordCount >= 10) {
    missing.push('No constraints, audience, or format specified');
  }

  return missing.slice(0, 3); // Cap at 3 to avoid overwhelming
}

// ---------------------------------------------------------------------------
// Conversation arc detection
// ---------------------------------------------------------------------------

function detectConversationArc(prompts: AnalyzedPrompt[]): ConversationArc {
  const total = prompts.length;
  if (total < 3) return 'flat';

  const midpoint = Math.floor(total / 2);
  const firstHalf = prompts.slice(0, midpoint);
  const secondHalf = prompts.slice(midpoint);

  const avgQuality = (ps: AnalyzedPrompt[]) =>
    ps.reduce((sum, p) => sum + p.qualityScore, 0) / ps.length;

  const firstAvg = avgQuality(firstHalf);
  const secondAvg = avgQuality(secondHalf);
  const diff = secondAvg - firstAvg;

  // Check for task-then-verify pattern
  const firstHalfDelegation = firstHalf.filter((p) => p.primaryIntent === 'delegation').length;
  const secondHalfVerification = secondHalf.filter(
    (p) => p.primaryIntent === 'verification' || p.primaryIntent === 'curiosity'
  ).length;
  if (
    firstHalfDelegation / firstHalf.length >= 0.6 &&
    secondHalfVerification / secondHalf.length >= 0.4
  ) {
    return 'task_then_verify';
  }

  // Check for consistent explorer
  const curiosityCount = prompts.filter(
    (p) => p.primaryIntent === 'curiosity' || p.primaryIntent === 'collaborative'
  ).length;
  if (curiosityCount / total >= 0.5 && Math.abs(diff) < 10) {
    return 'consistent_explorer';
  }

  // Warming up: quality increases significantly
  if (diff >= 12) {
    return 'warming_up';
  }

  // Fading out: quality decreases significantly
  if (diff <= -12) {
    return 'fading_out';
  }

  return 'flat';
}

// ---------------------------------------------------------------------------
// Public API — signature unchanged from the original lib/analyzer.ts
// ---------------------------------------------------------------------------

/**
 * Analyses an array of raw user prompt strings extracted from a conversation.
 * Returns a full AnalysisResult suitable for the results page.
 */
export function analyzeConversation(rawPrompts: string[]): AnalysisResult {
  const filtered = rawPrompts.filter((p) => p.trim().length > 0);

  if (filtered.length === 0) {
    return emptyResult();
  }

  // Step 1: classify and score each prompt
  const prompts: AnalyzedPrompt[] = filtered.map((text, index) => {
    const intentScores = scoreIntents(text);
    const primaryIntent = primaryIntentFrom(intentScores);
    const flags = detectFlags(text);
    const qualityScores = scorePromptQuality(text, flags, primaryIntent, index);
    const qualityScore = computeQualityScore(qualityScores);
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    // Cognitive role, effort tier, missing signals
    const cognitiveRole = classifyCognitiveRole(primaryIntent, flags, qualityScores, index);
    const effortTier = classifyEffortTier(flags, wordCount);
    const missingSignals = detectMissingSignals(text, flags, primaryIntent, wordCount);

    return {
      text,
      primaryIntent,
      intentScores,
      qualityScores,
      qualityScore,
      wordCount,
      flags,
      cognitiveRole,
      effortTier,
      missingSignals,
    };
  });

  // Step 2: aggregate conversation-level scores
  const scores = computeConversationScores(prompts);

  // Step 3: detect patterns
  const patterns = detectPatterns(prompts);

  // Step 4: distribution chart data
  const intentCounts: Record<string, number> = {
    delegation: 0,
    curiosity: 0,
    collaborative: 0,
    verification: 0,
  };
  for (const p of prompts) intentCounts[p.primaryIntent]++;

  const distribution: CategoryDistribution[] = Object.entries(intentCounts)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: CATEGORY_LABELS[key],
      value,
      color: CATEGORY_COLORS[key],
    }));

  // Step 5: conversation arc
  const conversationArc = detectConversationArc(prompts);

  // Step 6: summary and suggestions (summary uses arc)
  const summary = generateSummary(scores, prompts, conversationArc);
  const suggestions = generateSuggestions(scores, prompts, patterns);

  // Step 7: token estimation
  let anyFallback = false;
  const tokenBreakdown: TokenBreakdownEntry[] = prompts.map((p, i) => {
    const est = estimateTokens(p.text);
    if (est.fallback) anyFallback = true;
    return {
      index: i,
      tokens: est.tokens,
      costUsd: calculateCost(est.tokens, TOKEN_CONFIG.pricePerMillion),
    };
  });

  const totalPromptTokens = tokenBreakdown.reduce((sum, e) => sum + e.tokens, 0);
  const estimatedPromptCostUsd = calculateCost(totalPromptTokens, TOKEN_CONFIG.pricePerMillion);
  const tokenEstimateLabel = TOKEN_CONFIG.label;
  const tokenEstimateDisclaimer = anyFallback
    ? TOKEN_CONFIG.fallbackDisclaimer
    : TOKEN_CONFIG.disclaimer;

  return {
    prompts,
    scores,
    patterns,
    summary,
    suggestions,
    distribution,
    conversationArc,
    tokenBreakdown,
    totalPromptTokens,
    estimatedPromptCostUsd,
    tokenEstimateLabel,
    tokenEstimateDisclaimer,
  };
}

// ---------------------------------------------------------------------------
// Conversation-level score aggregation
// ---------------------------------------------------------------------------

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function computeConversationScores(prompts: AnalyzedPrompt[]): ConversationScores {
  const total = prompts.length;

  const autonomy = avg(prompts.map((p) => p.qualityScores.autonomy));
  const curiosity = avg(prompts.map((p) => p.qualityScores.curiosity));
  const criticalThinking = avg(prompts.map((p) => p.qualityScores.criticalThinking));
  const specificity = avg(prompts.map((p) => p.qualityScores.specificity));
  const context = avg(prompts.map((p) => p.qualityScores.context));

  // Engagement formula — uses cognitive roles instead of the old binary classification
  const engagedRoles: Set<string> = new Set([
    'exploring',
    'thinking_aloud',
    'stress_testing',
    'iterating',
    'directing',
  ]);
  const engagedRatio = prompts.filter((p) => engagedRoles.has(p.cognitiveRole)).length / total;
  const iterationAvg = avg(prompts.map((p) => p.qualityScores.iteration));
  const lengthScore = Math.min(total / 8, 1) * 35;
  const engagedScore = engagedRatio * 35;
  const iterationScore = iterationAvg * 0.3;
  const engagement = clamp(Math.round(lengthScore + engagedScore + iterationScore));

  const overallQuality = avg([
    autonomy,
    curiosity,
    criticalThinking,
    specificity,
    context,
    engagement,
  ]);

  return {
    autonomy,
    curiosity,
    criticalThinking,
    specificity,
    context,
    engagement,
    overallQuality,
  };
}

// ---------------------------------------------------------------------------
// Empty result
// ---------------------------------------------------------------------------

function emptyResult(): AnalysisResult {
  return {
    prompts: [],
    scores: {
      autonomy: 0,
      curiosity: 0,
      criticalThinking: 0,
      specificity: 0,
      context: 0,
      engagement: 0,
      overallQuality: 0,
    },
    patterns: [],
    summary: 'No prompts were detected. Try pasting a conversation with clear user messages.',
    suggestions: [],
    distribution: [],
    conversationArc: 'flat',
    tokenBreakdown: [],
    totalPromptTokens: 0,
    estimatedPromptCostUsd: 0,
    tokenEstimateLabel: TOKEN_CONFIG.label,
    tokenEstimateDisclaimer: TOKEN_CONFIG.disclaimer,
  };
}
