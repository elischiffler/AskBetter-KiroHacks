export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type PromptCategory =
  | "delegation"
  | "curiosity"
  | "collaborative"
  | "verification";

export interface AnalyzedPrompt {
  text: string;
  category: PromptCategory;
  isPassive: boolean;
  isActive: boolean;
  wordCount: number;
}

export interface ConversationScores {
  autonomy: number; // 0–100
  curiosity: number; // 0–100
  criticalThinking: number; // 0–100
  engagement: number; // 0–100
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
