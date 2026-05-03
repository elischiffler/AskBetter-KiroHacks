import { supabase } from './supabase';
import type { AnalysisResult } from '../analysis/types';

export interface ChatHistoryRow {
  id: string;
  title: string;
  overall_score: number;
  prompt_count: number;
  platform: string;
  analysis_result: AnalysisResult;
  created_at: string;
}

/** Derive a short title from the first user prompt. */
function deriveTitle(result: AnalysisResult): string {
  const first = result.prompts[0]?.text ?? '';
  const trimmed = first.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= 60) return trimmed || 'Untitled Chat';
  return trimmed.slice(0, 57) + '…';
}

/** Save an analysis result for the current user. */
export async function saveAnalysis(
  userId: string,
  result: AnalysisResult,
  platform: string = 'unknown'
) {
  const { error } = await supabase.from('chat_histories').insert({
    user_id: userId,
    title: deriveTitle(result),
    overall_score: Math.round(result.scores.overallQuality),
    prompt_count: result.prompts.length,
    platform,
    analysis_result: result as unknown as Record<string, unknown>,
  });
  if (error) throw error;
}

/** Fetch all history rows for a user, newest first. */
export async function fetchHistory(userId: string): Promise<ChatHistoryRow[]> {
  const { data, error } = await supabase
    .from('chat_histories')
    .select('id, title, overall_score, prompt_count, platform, analysis_result, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ChatHistoryRow[];
}

/** Delete a single history entry. */
export async function deleteHistory(id: string) {
  const { error } = await supabase.from('chat_histories').delete().eq('id', id);
  if (error) throw error;
}
