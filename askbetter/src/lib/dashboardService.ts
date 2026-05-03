import { supabase } from './supabase';
import type { ConversationScores } from '../analysis/types';

export interface AnalysisHistory {
  id: string;
  user_id: string;
  created_at: string;
  scores: ConversationScores;
  prompt_count: number;
  passive_count: number;
  active_count: number;
}

export interface DashboardStats {
  totalAnalyses: number;
  averageScores: ConversationScores;
  recentScores: ConversationScores | null;
  trend: 'improving' | 'declining' | 'stable';
  trendPercentage: number;
  history: AnalysisHistory[];
}

/**
 * Save an analysis result to the database
 */
export async function saveAnalysis(
  userId: string,
  scores: ConversationScores,
  promptCount: number,
  passiveCount: number,
  activeCount: number
): Promise<void> {
  const { error } = await supabase.from('analysis_history').insert({
    user_id: userId,
    scores,
    prompt_count: promptCount,
    passive_count: passiveCount,
    active_count: activeCount,
  });

  if (error) {
    console.error('Error saving analysis:', error);
    throw error;
  }
}

/**
 * Get all analysis history for a user
 */
export async function getAnalysisHistory(userId: string): Promise<AnalysisHistory[]> {
  const { data, error } = await supabase
    .from('analysis_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching analysis history:', error);
    throw error;
  }

  return data || [];
}

/**
 * Calculate dashboard statistics from analysis history
 */
export function calculateDashboardStats(history: AnalysisHistory[]): DashboardStats {
  if (history.length === 0) {
    return {
      totalAnalyses: 0,
      averageScores: {
        autonomy: 0,
        curiosity: 0,
        criticalThinking: 0,
        specificity: 0,
        context: 0,
        engagement: 0,
        overallQuality: 0,
      },
      recentScores: null,
      trend: 'stable',
      trendPercentage: 0,
      history: [],
    };
  }

  // Calculate average scores across all analyses
  const averageScores: ConversationScores = {
    autonomy: 0,
    curiosity: 0,
    criticalThinking: 0,
    specificity: 0,
    context: 0,
    engagement: 0,
    overallQuality: 0,
  };

  history.forEach((analysis) => {
    averageScores.autonomy += analysis.scores.autonomy;
    averageScores.curiosity += analysis.scores.curiosity;
    averageScores.criticalThinking += analysis.scores.criticalThinking;
    averageScores.specificity += analysis.scores.specificity;
    averageScores.context += analysis.scores.context;
    averageScores.engagement += analysis.scores.engagement;
    averageScores.overallQuality += analysis.scores.overallQuality;
  });

  const count = history.length;
  averageScores.autonomy /= count;
  averageScores.curiosity /= count;
  averageScores.criticalThinking /= count;
  averageScores.specificity /= count;
  averageScores.context /= count;
  averageScores.engagement /= count;
  averageScores.overallQuality /= count;

  // Get most recent scores
  const recentScores = history[history.length - 1].scores;

  // Calculate trend (compare recent 3 vs previous 3, or available)
  let trend: 'improving' | 'declining' | 'stable' = 'stable';
  let trendPercentage = 0;

  if (history.length >= 2) {
    const recentCount = Math.min(3, Math.floor(history.length / 2));
    const previousCount = Math.min(3, history.length - recentCount);

    const recentAnalyses = history.slice(-recentCount);
    const previousAnalyses = history.slice(-(recentCount + previousCount), -recentCount);

    const recentAvg =
      recentAnalyses.reduce((sum, a) => sum + a.scores.overallQuality, 0) / recentAnalyses.length;
    const previousAvg =
      previousAnalyses.reduce((sum, a) => sum + a.scores.overallQuality, 0) /
      previousAnalyses.length;

    const difference = recentAvg - previousAvg;
    trendPercentage = Math.abs((difference / previousAvg) * 100);

    if (difference > 2) {
      trend = 'improving';
    } else if (difference < -2) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }
  }

  return {
    totalAnalyses: count,
    averageScores,
    recentScores,
    trend,
    trendPercentage,
    history,
  };
}

/**
 * Get dashboard statistics for a user
 */
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const history = await getAnalysisHistory(userId);
  return calculateDashboardStats(history);
}
