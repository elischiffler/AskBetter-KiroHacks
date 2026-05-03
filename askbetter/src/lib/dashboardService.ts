import { supabase } from './supabase';
import type { ConversationScores, AnalysisResult } from '../analysis/types';

export interface AnalysisHistory {
  id: string;
  user_id: string;
  created_at: string;
  scores: ConversationScores;
  prompt_count: number;
  title: string;
  platform: string;
  analysis_result: AnalysisResult;
}

export interface DashboardStats {
  totalAnalyses: number;
  averageScores: ConversationScores;
  recentScores: ConversationScores | null;
  trend: 'improving' | 'declining' | 'stable';
  trendPercentage: number;
  history: AnalysisHistory[];
  platformBreakdown: Record<string, number>;
}

/**
 * Get all analysis history for a user by reading from chat_histories
 * and deriving the scores from the stored AnalysisResult JSON.
 */
async function getAnalysisHistory(userId: string): Promise<AnalysisHistory[]> {
  const { data, error } = await supabase
    .from('chat_histories')
    .select('id, user_id, created_at, prompt_count, title, platform, analysis_result')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching analysis history:', error);
    throw error;
  }

  return (data ?? []).map((row) => {
    const analysisResult = row.analysis_result as unknown as AnalysisResult;
    return {
      id: row.id as string,
      user_id: row.user_id as string,
      created_at: row.created_at as string,
      scores: analysisResult.scores,
      prompt_count: row.prompt_count as number,
      title: row.title as string,
      platform: (row.platform as string) || 'unknown',
      analysis_result: analysisResult,
    };
  });
}

/**
 * Calculate dashboard statistics from analysis history
 */
function calculateDashboardStats(history: AnalysisHistory[]): DashboardStats {
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
      platformBreakdown: {},
    };
  }

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

  const recentScores = history[history.length - 1].scores;

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
    trendPercentage = previousAvg > 0 ? Math.abs((difference / previousAvg) * 100) : 0;

    if (difference > 2) {
      trend = 'improving';
    } else if (difference < -2) {
      trend = 'declining';
    }
  }

  // Calculate platform breakdown
  const platformBreakdown: Record<string, number> = {};
  history.forEach((analysis) => {
    const p = analysis.platform || 'unknown';
    platformBreakdown[p] = (platformBreakdown[p] || 0) + 1;
  });

  return {
    totalAnalyses: count,
    averageScores,
    recentScores,
    trend,
    trendPercentage,
    history,
    platformBreakdown,
  };
}

/**
 * Get dashboard statistics for a user (reads from chat_histories)
 */
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const history = await getAnalysisHistory(userId);
  return calculateDashboardStats(history);
}
