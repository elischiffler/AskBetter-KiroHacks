import type { AnalyzedPrompt, DetectedPattern } from './types';

// ---------------------------------------------------------------------------
// Pattern detection
// ---------------------------------------------------------------------------

/**
 * Analyses the full set of classified prompts and returns detected patterns.
 */
export function detectPatterns(prompts: AnalyzedPrompt[]): DetectedPattern[] {
  const total = prompts.length;
  if (total === 0) return [];

  const patterns: DetectedPattern[] = [];

  const counts = {
    delegation: 0,
    curiosity: 0,
    collaborative: 0,
    verification: 0,
  };
  for (const p of prompts) counts[p.primaryIntent]++;

  // ---- Warning patterns ----

  // 1. one_and_done
  if (total === 1) {
    patterns.push({
      id: 'one_and_done',
      label: 'One-and-done prompting',
      description: 'Only one message was sent. No iteration or follow-up.',
      severity: 'warning',
    });
  }

  // 2. no_followup_questions
  if (total > 1 && counts.curiosity === 0 && counts.collaborative === 0) {
    patterns.push({
      id: 'no_followup_questions',
      label: 'No follow-up questions',
      description:
        'You never asked a follow-up or explored ideas further across the whole conversation.',
      severity: 'warning',
    });
  }

  // 3. mostly_delegation — delegation > 60% AND those prompts lack learning flags
  const pureDelegationCount = prompts.filter(
    (p) =>
      p.primaryIntent === 'delegation' &&
      !p.flags.includes('delegation_with_learning_intent') &&
      !p.flags.includes('shows_prior_attempt')
  ).length;
  const pureDelegationRatio = pureDelegationCount / total;
  if (pureDelegationRatio > 0.6) {
    patterns.push({
      id: 'mostly_delegation',
      label: 'Mostly task delegation',
      description: `${Math.round(pureDelegationRatio * 100)}% of your prompts were bare task requests with no learning intent or prior attempt.`,
      severity: 'warning',
    });
  }

  // 4. copy_paste_without_question
  const copyPasteCount = prompts.filter((p) =>
    p.flags.includes('copy_paste_without_question')
  ).length;
  if (copyPasteCount >= 2) {
    patterns.push({
      id: 'copy_paste_without_question',
      label: 'Possible copy-paste behavior',
      description:
        'Several long prompts had no questions — may indicate pasting content without engaging.',
      severity: 'warning',
    });
  }

  // ---- Positive patterns ----

  // 5. strong_active_learning
  const curiosityRatio = counts.curiosity / total;
  const activeFlagCount = prompts.filter(
    (p) =>
      p.flags.includes('delegation_with_learning_intent') ||
      p.flags.includes('shows_prior_attempt') ||
      p.flags.includes('asks_for_reasoning') ||
      p.flags.includes('asks_for_alternatives') ||
      p.flags.includes('asks_for_risk_or_limitations')
  ).length;
  const activeFlagRatio = activeFlagCount / total;

  if (curiosityRatio >= 0.3 || activeFlagRatio >= 0.4) {
    patterns.push({
      id: 'strong_active_learning',
      label: 'Strong active learning',
      description:
        'You asked exploratory questions or showed learning intent frequently — a great sign of engaged thinking.',
      severity: 'positive',
    });
  }

  // 6. good_verification
  const verificationFlagCount = prompts.filter(
    (p) => p.primaryIntent === 'verification' || p.flags.includes('asks_for_risk_or_limitations')
  ).length;
  if (counts.verification >= 2 || verificationFlagCount >= 2) {
    patterns.push({
      id: 'good_verification',
      label: 'Good use of verification',
      description: 'You asked AI to check, review, or critique your work multiple times.',
      severity: 'positive',
    });
  }

  // 7. collaborative_thinking
  if (counts.collaborative / total >= 0.25) {
    patterns.push({
      id: 'collaborative_thinking',
      label: 'Collaborative thinking',
      description:
        'You used AI as a thinking partner — brainstorming, comparing, and deciding together.',
      severity: 'positive',
    });
  }

  // 8. delegation_with_learning_intent (positive signal)
  const learningDelegationCount = prompts.filter((p) =>
    p.flags.includes('delegation_with_learning_intent')
  ).length;
  if (learningDelegationCount >= 2) {
    patterns.push({
      id: 'delegation_with_learning',
      label: 'Delegation with learning intent',
      description:
        'You delegated tasks but also asked for explanations or reasoning — turning tasks into learning opportunities.',
      severity: 'positive',
    });
  }

  // 9. shows_prior_attempt (positive signal)
  const priorAttemptCount = prompts.filter((p) => p.flags.includes('shows_prior_attempt')).length;
  if (priorAttemptCount >= 1) {
    patterns.push({
      id: 'shows_prior_attempt',
      label: 'Shows prior attempt',
      description:
        'You shared your own thinking or attempt before asking for help — a strong sign of active engagement.',
      severity: 'positive',
    });
  }

  // 10. deep_engagement
  if (total >= 6 && prompts.filter((p) => p.isActive).length / total >= 0.5) {
    patterns.push({
      id: 'deep_engagement',
      label: 'Deep engagement',
      description: 'Long conversation with a high proportion of active, thoughtful prompts.',
      severity: 'positive',
    });
  }

  return patterns;
}
