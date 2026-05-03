import { ArrowUp, ArrowDown } from 'lucide-react';
import type { ConversationScores } from '../analysis/types';

// ── design tokens ─────────────────────────────────────────────────────────────
const CARD_BG = '#1a1030';
const BORDER = 'rgba(139, 92, 246, 0.25)';
const TEXT_PRIMARY = '#f5f3ff';
const TEXT_MUTED = '#a78bfa';

interface ComparisonCardProps {
  label: string;
  averageScore: number;
  recentScore: number | null;
}

function ScoreComparison({ label, averageScore, recentScore }: ComparisonCardProps) {
  const difference = recentScore !== null ? recentScore - averageScore : 0;
  const isImprovement = difference > 0;
  const hasChange = Math.abs(difference) > 1;

  return (
    <div
      className="flex items-center justify-between p-4 rounded-lg"
      style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
    >
      <div className="flex-1">
        <div className="text-sm mb-1" style={{ color: TEXT_MUTED }}>
          {label}
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

export function ComparisonCards({ averageScores, recentScores }: ComparisonCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <ScoreComparison
        label="Autonomy"
        averageScore={averageScores.autonomy}
        recentScore={recentScores?.autonomy ?? null}
      />
      <ScoreComparison
        label="Curiosity"
        averageScore={averageScores.curiosity}
        recentScore={recentScores?.curiosity ?? null}
      />
      <ScoreComparison
        label="Critical Thinking"
        averageScore={averageScores.criticalThinking}
        recentScore={recentScores?.criticalThinking ?? null}
      />
      <ScoreComparison
        label="Specificity"
        averageScore={averageScores.specificity}
        recentScore={recentScores?.specificity ?? null}
      />
      <ScoreComparison
        label="Context"
        averageScore={averageScores.context}
        recentScore={recentScores?.context ?? null}
      />
      <ScoreComparison
        label="Engagement"
        averageScore={averageScores.engagement}
        recentScore={recentScores?.engagement ?? null}
      />
    </div>
  );
}
