export type PromptIntent = 'delegation' | 'curiosity' | 'collaborative' | 'verification';

export type CognitiveRole =
  | 'outsourcing'
  | 'directing'
  | 'exploring'
  | 'thinking_aloud'
  | 'stress_testing'
  | 'rubber_stamping'
  | 'iterating';

export type EffortTier = 'low_effort' | 'structured' | 'invested' | 'rigorous';

export interface IntentScores {
  delegation: number;
  curiosity: number;
  collaborative: number;
  verification: number;
}

export interface QualityScores {
  autonomy: number;
  curiosity: number;
  criticalThinking: number;
  specificity: number;
  context: number;
  iteration: number;
}

export interface AnalyzedPrompt {
  text: string;
  primaryIntent: PromptIntent;
  intentScores: IntentScores;
  qualityScores: QualityScores;
  qualityScore: number;
  wordCount: number;
  flags: string[];
  cognitiveRole: CognitiveRole;
  effortTier: EffortTier;
  missingSignals: string[];
}

export interface ConversationScores {
  autonomy: number;
  curiosity: number;
  criticalThinking: number;
  specificity: number;
  context: number;
  engagement: number;
  overallQuality: number;
}

export type ConversationArc =
  | 'warming_up'
  | 'fading_out'
  | 'consistent_explorer'
  | 'task_then_verify'
  | 'flat';

export type PatternSeverity = 'positive' | 'warning' | 'neutral';

export interface DetectedPattern {
  id: string;
  label: string;
  description: string;
  severity: PatternSeverity;
}

export interface CategoryDistribution {
  name: string;
  value: number;
  color: string;
}

export interface AnalysisResult {
  prompts: AnalyzedPrompt[];
  scores: ConversationScores;
  patterns: DetectedPattern[];
  summary: string;
  suggestions: string[];
  distribution: CategoryDistribution[];
  conversationArc: ConversationArc;
}
