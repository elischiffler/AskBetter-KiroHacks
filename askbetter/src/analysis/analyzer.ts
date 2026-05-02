import { scoreIntents, primaryIntentFrom } from './classifier';
import { detectFlags, scorePromptQuality, computeQualityScore } from './rubric';
import { detectPatterns } from './patterns';
import { generateSummary, generateSuggestions } from './suggestions';
import type {
  AnalyzedPrompt,
  AnalysisResult,
  ConversationScores,
  CategoryDistribution,
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

    // isPassive: delegation + low quality + no learning signals
    const isPassive =
      primaryIntent === 'delegation' &&
      qualityScore < 60 &&
      !flags.includes('delegation_with_learning_intent') &&
      !flags.includes('shows_prior_attempt');

    // isActive: non-delegation intent OR any active learning flag
    const isActive =
      primaryIntent !== 'delegation' ||
      flags.includes('delegation_with_learning_intent') ||
      flags.includes('shows_prior_attempt') ||
      flags.includes('asks_for_reasoning') ||
      flags.includes('asks_for_alternatives') ||
      flags.includes('asks_for_risk_or_limitations');

    return {
      text,
      primaryIntent,
      intentScores,
      qualityScores,
      qualityScore,
      wordCount,
      flags,
      isPassive,
      isActive,
    };
  });

  const total = prompts.length;

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

  // Step 5: pick examples
  const passiveExamples = prompts.filter((p) => p.isPassive).slice(0, 3);
  const activeExamples = prompts.filter((p) => p.isActive).slice(0, 3);

  // Step 6: summary and suggestions
  const summary = generateSummary(scores, prompts);
  const suggestions = generateSuggestions(scores);

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

  // Suppress unused variable warning for total (used implicitly via prompts.length)
  void total;
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

  // Engagement formula
  const activeRatio = prompts.filter((p) => p.isActive).length / total;
  const iterationAvg = avg(prompts.map((p) => p.qualityScores.iteration));
  const lengthScore = Math.min(total / 8, 1) * 35;
  const activeScore = activeRatio * 35;
  const iterationScore = iterationAvg * 0.3;
  const engagement = clamp(Math.round(lengthScore + activeScore + iterationScore));

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
    passiveExamples: [],
    activeExamples: [],
    distribution: [],
  };
}
