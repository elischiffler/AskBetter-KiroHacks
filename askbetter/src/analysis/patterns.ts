import type { AnalyzedPrompt, DetectedPattern } from './types';

// ---------------------------------------------------------------------------
// Pattern detection
// Tone: honest. Positive patterns require genuinely high bars to fire.
// Descriptions name what happened, not how impressive it was.
// ---------------------------------------------------------------------------

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
      label: 'One-and-done',
      description:
        'You sent one message and stopped. There was no iteration, no follow-up, and no way to know if the answer was actually right.',
      severity: 'warning',
    });
  }

  // 2. no_followup_questions
  if (total > 1 && counts.curiosity === 0 && counts.collaborative === 0) {
    patterns.push({
      id: 'no_followup_questions',
      label: 'No follow-up questions',
      description:
        'You never asked a follow-up or explored an idea further. Every response was accepted as-is.',
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
      description: `${Math.round(pureDelegationRatio * 100)}% of your prompts were bare task requests — no context, no learning intent, no prior attempt shared.`,
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
      label: 'Copy-paste without a question',
      description: `${copyPasteCount} long prompts had no question mark. Pasting content without asking anything specific means you're outsourcing judgment, not getting help.`,
      severity: 'warning',
    });
  }

  // 5. shallow_verification — asked AI to check but never asked why or what could fail
  const verificationWithoutDepth = prompts.filter(
    (p) =>
      p.primaryIntent === 'verification' &&
      !p.flags.includes('asks_for_risk_or_limitations') &&
      !p.flags.includes('asks_for_reasoning')
  ).length;
  if (verificationWithoutDepth >= 2) {
    patterns.push({
      id: 'shallow_verification',
      label: 'Shallow verification',
      description: `You asked AI to check your work ${verificationWithoutDepth} times but never asked what could go wrong or why. "Is this correct?" is weaker than "What would break this?"`,
      severity: 'warning',
    });
  }

  // ---- Positive patterns — high bars, honest descriptions ----

  // 6. engaged_learning — requires both high curiosity ratio AND learning flags
  // Not just one or the other
  const curiosityRatio = counts.curiosity / total;
  const learningFlagCount = prompts.filter(
    (p) =>
      p.flags.includes('delegation_with_learning_intent') ||
      p.flags.includes('shows_prior_attempt') ||
      p.flags.includes('asks_for_reasoning') ||
      p.flags.includes('asks_for_alternatives') ||
      p.flags.includes('asks_for_risk_or_limitations')
  ).length;
  const learningFlagRatio = learningFlagCount / total;

  if (curiosityRatio >= 0.4 && learningFlagRatio >= 0.4) {
    patterns.push({
      id: 'engaged_learning',
      label: 'Engaged learning',
      description:
        'You asked exploratory questions and showed learning intent across a significant portion of the conversation.',
      severity: 'positive',
    });
  }

  // 7. good_verification — requires multiple verification prompts with depth
  const deepVerificationCount = prompts.filter(
    (p) =>
      (p.primaryIntent === 'verification' || p.flags.includes('asks_for_risk_or_limitations')) &&
      (p.flags.includes('asks_for_reasoning') || p.flags.includes('asks_for_risk_or_limitations'))
  ).length;
  if (deepVerificationCount >= 2) {
    patterns.push({
      id: 'good_verification',
      label: 'Verification with depth',
      description:
        'You asked AI to check your work and pushed for reasoning or edge cases — not just a yes/no.',
      severity: 'positive',
    });
  }

  // 8. collaborative_thinking — requires meaningful ratio, not just a few prompts
  if (counts.collaborative / total >= 0.3) {
    patterns.push({
      id: 'collaborative_thinking',
      label: 'Collaborative thinking',
      description:
        'You used AI to think through decisions, not just execute tasks — brainstorming, comparing options, and working through tradeoffs.',
      severity: 'positive',
    });
  }

  // 9. delegation_with_learning_intent — requires at least 3 prompts, not just 2
  const learningDelegationCount = prompts.filter((p) =>
    p.flags.includes('delegation_with_learning_intent')
  ).length;
  if (learningDelegationCount >= 3) {
    patterns.push({
      id: 'delegation_with_learning',
      label: 'Delegation with learning intent',
      description: `${learningDelegationCount} task prompts included a request for explanation or reasoning — you delegated without fully outsourcing your understanding.`,
      severity: 'positive',
    });
  }

  // 10. shows_prior_attempt — requires at least 2 prompts showing own work
  const priorAttemptCount = prompts.filter((p) => p.flags.includes('shows_prior_attempt')).length;
  if (priorAttemptCount >= 2) {
    patterns.push({
      id: 'shows_prior_attempt',
      label: 'Shows prior attempt',
      description: `You shared your own thinking or attempt in ${priorAttemptCount} prompts before asking for help. That's how you get targeted feedback instead of generic answers.`,
      severity: 'positive',
    });
  }

  // 11. deep_engagement — long conversation AND majority engaged
  const engagedRoles: Set<string> = new Set([
    'exploring',
    'thinking_aloud',
    'stress_testing',
    'iterating',
    'directing',
  ]);
  if (
    total >= 8 &&
    prompts.filter((p) => engagedRoles.has(p.cognitiveRole)).length / total >= 0.6
  ) {
    patterns.push({
      id: 'deep_engagement',
      label: 'Deep engagement',
      description: `${total} prompts with over 60% showing real engagement — you sustained thoughtful interaction throughout the conversation.`,
      severity: 'positive',
    });
  }

  // ---- Conversation arc patterns ----

  // 12. warming_up — quality improves over the conversation
  if (total >= 4) {
    const midpoint = Math.floor(total / 2);
    const firstHalf = prompts.slice(0, midpoint);
    const secondHalf = prompts.slice(midpoint);
    const firstAvg = firstHalf.reduce((s, p) => s + p.qualityScore, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, p) => s + p.qualityScore, 0) / secondHalf.length;
    const diff = secondAvg - firstAvg;

    if (diff >= 12) {
      patterns.push({
        id: 'warming_up',
        label: 'Warming up',
        description:
          'Your prompts got noticeably better as the conversation progressed — you started with bare requests but found your footing.',
        severity: 'positive',
      });
    } else if (diff <= -12) {
      patterns.push({
        id: 'fading_out',
        label: 'Fading out',
        description:
          'Your prompts started strong but devolved into bare requests toward the end. Fatigue or time pressure may have kicked in.',
        severity: 'warning',
      });
    }

    // 13. task_then_verify — delegation followed by verification/curiosity
    const firstHalfDelegation = firstHalf.filter((p) => p.primaryIntent === 'delegation').length;
    const secondHalfVerification = secondHalf.filter(
      (p) => p.primaryIntent === 'verification' || p.primaryIntent === 'curiosity'
    ).length;
    if (
      firstHalfDelegation / firstHalf.length >= 0.6 &&
      secondHalfVerification / secondHalf.length >= 0.4
    ) {
      patterns.push({
        id: 'task_then_verify',
        label: 'Task then verify',
        description:
          'You delegated tasks first, then circled back to verify and explore — a healthy pattern of "build then check."',
        severity: 'positive',
      });
    }
  }

  return patterns;
}
