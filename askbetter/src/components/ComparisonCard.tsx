import { ArrowUp, ArrowDown } from 'lucide-react';
import type { ConversationScores } from '../analysis/types';

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
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex-1">
        <div className="text-sm text-gray-600 mb-1">{label}</div>
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold text-gray-900">{Math.round(averageScore)}</span>
          <span className="text-sm text-gray-500">avg</span>
          {recentScore !== null && (
            <>
              <span className="text-gray-400">→</span>
              <span className="text-xl font-semibold text-purple-600">
                {Math.round(recentScore)}
              </span>
              <span className="text-sm text-gray-500">recent</span>
            </>
          )}
        </div>
      </div>
      {hasChange && recentScore !== null && (
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
            isImprovement ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
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
