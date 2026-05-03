import { useState } from 'react';
import { ArrowUp, ArrowDown, Info } from 'lucide-react';
import type { ConversationScores } from '../analysis/types';

// ── design tokens ─────────────────────────────────────────────────────────────
const CARD_BG = '#1a1030';
const BORDER = 'rgba(139, 92, 246, 0.25)';
const TEXT_PRIMARY = '#f5f3ff';
const TEXT_MUTED = '#a78bfa';
const TEXT_DIM = '#6b5fa0';

interface ComparisonCardProps {
  label: string;
  averageScore: number;
  recentScore: number | null;
  tooltip?: string;
}

function ScoreComparison({ label, averageScore, recentScore, tooltip }: ComparisonCardProps) {
  const difference = recentScore !== null ? recentScore - averageScore : 0;
  const isImprovement = difference > 0;
  const hasChange = Math.abs(difference) > 1;
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="flex items-center justify-between p-4 rounded-lg"
      style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
    >
      <div className="flex-1">
        <div
          className="text-sm mb-1 flex items-center gap-1.5 relative"
          style={{ color: TEXT_MUTED }}
        >
          {label}
          {tooltip && (
            <span
              className="inline-flex cursor-help"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onTouchStart={() => setShowTooltip((v) => !v)}
            >
              <Info className="w-3.5 h-3.5" style={{ color: TEXT_DIM }} />
              {showTooltip && (
                <span
                  className="absolute left-0 top-full mt-1.5 z-50 w-56 px-3 py-2 rounded-lg text-xs leading-relaxed shadow-lg"
                  style={{
                    backgroundColor: '#1e1545',
                    border: `1px solid ${BORDER}`,
                    color: TEXT_MUTED,
                  }}
                >
                  {tooltip}
                </span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold" style={{ color: TEXT_PRIMARY }}>
            {Math.round(averageScore)}
          </span>
          <span className="text-sm" style={{ color: TEXT_MUTED }}>
            avg
          </span>
          {recentScore !== null && (
            <>
              <span style={{ color: TEXT_MUTED }}>→</span>
              <span className="text-xl font-semibold" style={{ color: '#7c3aed' }}>
                {Math.round(recentScore)}
              </span>
              <span className="text-sm" style={{ color: TEXT_MUTED }}>
                recent
              </span>
            </>
          )}
        </div>
      </div>
      {hasChange && recentScore !== null && (
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium"
          style={{
            backgroundColor: isImprovement ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: isImprovement ? '#10b981' : '#ef4444',
          }}
        >
          {isImprovement ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
          {Math.abs(difference).toFixed(0)}
        </div>
      )}
    </div>
  );
}

interface ComparisonCardsProps {
  averageScores: ConversationScores;
  recentScores: ConversationScores | null;
}

const SCORE_TOOLTIPS: Record<string, string> = {
  autonomy:
    'Did you show your own thinking before asking? Higher means you shared attempts, reasoning, or context instead of just offloading tasks.',
  curiosity:
    'Did you ask why, how, or what-if? Higher means you explored ideas and asked the AI to explain, not just produce.',
  criticalThinking:
    'Did you challenge answers? Higher means you asked for edge cases, risks, alternatives, or reasoning — not just accepted outputs.',
  specificity:
    'Did you give clear goals and constraints? Higher means your prompts included audience, format, examples, or success criteria.',
  context:
    'Did you provide background? Higher means you gave the AI enough information to give a targeted answer instead of a generic one.',
  engagement:
    'Did you iterate and follow up? Higher means you built on responses, asked follow-ups, and sustained a real conversation.',
};

export function ComparisonCards({ averageScores, recentScores }: ComparisonCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <ScoreComparison
        label="Autonomy"
        averageScore={averageScores.autonomy}
        recentScore={recentScores?.autonomy ?? null}
        tooltip={SCORE_TOOLTIPS.autonomy}
      />
      <ScoreComparison
        label="Curiosity"
        averageScore={averageScores.curiosity}
        recentScore={recentScores?.curiosity ?? null}
        tooltip={SCORE_TOOLTIPS.curiosity}
      />
      <ScoreComparison
        label="Critical Thinking"
        averageScore={averageScores.criticalThinking}
        recentScore={recentScores?.criticalThinking ?? null}
        tooltip={SCORE_TOOLTIPS.criticalThinking}
      />
      <ScoreComparison
        label="Specificity"
        averageScore={averageScores.specificity}
        recentScore={recentScores?.specificity ?? null}
        tooltip={SCORE_TOOLTIPS.specificity}
      />
      <ScoreComparison
        label="Context"
        averageScore={averageScores.context}
        recentScore={recentScores?.context ?? null}
        tooltip={SCORE_TOOLTIPS.context}
      />
      <ScoreComparison
        label="Engagement"
        averageScore={averageScores.engagement}
        recentScore={recentScores?.engagement ?? null}
        tooltip={SCORE_TOOLTIPS.engagement}
      />
    </div>
  );
}
