export type PromptIntent =
  | "delegation"
  | "curiosity"
  | "collaborative"
  | "verification";

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
  isPassive: boolean;
  isActive: boolean;
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

export type PatternSeverity = "positive" | "warning" | "neutral";

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
  passiveExamples: AnalyzedPrompt[];
  activeExamples: AnalyzedPrompt[];
  distribution: CategoryDistribution[];
}
