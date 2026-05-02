/**
 * Dolly 15k-inspired calibration examples.
 *
 * These are hand-labeled examples used to guide and validate the scoring rules.
 * They are NOT loaded at runtime for classification — they serve as documentation
 * and a reference for tuning signal lists and rubric weights.
 *
 * Source inspiration: Databricks Dolly 15k open-source instruction dataset.
 * All examples here are original, hand-crafted for AskBetter.
 */

export type CalibrationQuality = 'strong' | 'moderate' | 'weak';

export interface CalibrationExample {
  source: string;
  text: string;
  expectedIntent: 'delegation' | 'curiosity' | 'collaborative' | 'verification';
  expectedStrengths: string[];
  quality: CalibrationQuality;
  notes?: string;
}

export const CALIBRATION_EXAMPLES: CalibrationExample[] = [
  // --- Strong collaborative ---
  {
    source: 'Dolly 15k-inspired',
    text: 'Brainstorm three ways to improve this app and explain the tradeoffs of each.',
    expectedIntent: 'collaborative',
    expectedStrengths: ['asks_for_alternatives', 'asks_for_reasoning'],
    quality: 'strong',
    notes: 'Asks for multiple options AND reasoning — high critical thinking signal.',
  },

  // --- Weak delegation ---
  {
    source: 'Dolly 15k-inspired',
    text: 'Write a summary of this article.',
    expectedIntent: 'delegation',
    expectedStrengths: [],
    quality: 'weak',
    notes: 'Bare delegation with no context, audience, format, or constraints.',
  },

  // --- Strong delegation (with specificity) ---
  {
    source: 'Dolly 15k-inspired',
    text: 'Summarize this article for a high school audience in five bullet points, then list two assumptions you made.',
    expectedIntent: 'delegation',
    expectedStrengths: ['specificity', 'asks_for_reasoning'],
    quality: 'strong',
    notes:
      'Delegation with audience, format, and a meta-cognitive ask — strong despite being a task prompt.',
  },

  // --- Strong collaborative ---
  {
    source: 'Dolly 15k-inspired',
    text: 'What are the pros and cons of using SQLite instead of PostgreSQL for a small restaurant review app?',
    expectedIntent: 'collaborative',
    expectedStrengths: ['asks_for_alternatives'],
    quality: 'strong',
    notes: 'Specific context (restaurant review app) + comparison request.',
  },

  // --- Strong verification ---
  {
    source: 'Dolly 15k-inspired',
    text: 'Is my answer correct? Point out any missing edge cases.',
    expectedIntent: 'verification',
    expectedStrengths: ['asks_for_risk_or_limitations'],
    quality: 'strong',
    notes: 'Verification + explicit edge case request = high critical thinking.',
  },

  // --- Strong curiosity ---
  {
    source: 'Dolly 15k-inspired',
    text: 'Why does React re-render a component when state changes, and what happens under the hood?',
    expectedIntent: 'curiosity',
    expectedStrengths: ['asks_for_reasoning'],
    quality: 'strong',
    notes: 'Deep why-question with a follow-up sub-question.',
  },

  // --- Weak curiosity (low specificity) ---
  {
    source: 'Dolly 15k-inspired',
    text: 'Why?',
    expectedIntent: 'curiosity',
    expectedStrengths: [],
    quality: 'weak',
    notes: 'Curiosity intent but zero specificity or context.',
  },

  // --- Strong delegation with learning intent ---
  {
    source: 'Dolly 15k-inspired',
    text: 'Fix this function and explain what was wrong so I understand the bug.',
    expectedIntent: 'delegation',
    expectedStrengths: ['delegation_with_learning_intent'],
    quality: 'strong',
    notes: 'Delegation + explicit learning intent — should NOT be treated as purely passive.',
  },

  // --- Strong shows_prior_attempt ---
  {
    source: 'Dolly 15k-inspired',
    text: "I tried sorting the array with .sort() but it's giving wrong results for numbers. Here's my code — what am I missing?",
    expectedIntent: 'curiosity',
    expectedStrengths: ['shows_prior_attempt', 'asks_for_reasoning'],
    quality: 'strong',
    notes: 'User shows their work and asks for understanding, not just a fix.',
  },

  // --- Weak copy-paste ---
  {
    source: 'Dolly 15k-inspired',
    text: 'The mitochondria is the powerhouse of the cell. Cells contain many organelles including the nucleus which stores DNA, the endoplasmic reticulum which processes proteins, and the Golgi apparatus which packages and ships proteins to their destinations within or outside the cell.',
    expectedIntent: 'delegation',
    expectedStrengths: [],
    quality: 'weak',
    notes: 'Long block of text with no question — likely copy-pasted content with no engagement.',
  },

  // --- Strong risk/limitations ask ---
  {
    source: 'Dolly 15k-inspired',
    text: 'What are the limitations of using JWT for authentication? What edge cases or failure modes should I be aware of?',
    expectedIntent: 'curiosity',
    expectedStrengths: ['asks_for_risk_or_limitations'],
    quality: 'strong',
    notes: 'Proactively asks for failure modes — high critical thinking.',
  },

  // --- Moderate: delegation with some context ---
  {
    source: 'Dolly 15k-inspired',
    text: 'Write a Python function that validates an email address using regex.',
    expectedIntent: 'delegation',
    expectedStrengths: [],
    quality: 'moderate',
    notes: 'Has a specific task and language, but no constraints, examples, or learning intent.',
  },
];
