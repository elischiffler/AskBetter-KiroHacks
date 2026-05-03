import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ── design tokens ─────────────────────────────────────────────────────────────
const CARD_BG = '#1a1030';
const BORDER = 'rgba(139, 92, 246, 0.25)';
const TEXT_PRIMARY = '#f5f3ff';
const TEXT_MUTED = '#a78bfa';

interface ProgressIndicatorProps {
  trend: 'improving' | 'declining' | 'stable';
  percentage: number;
  totalAnalyses: number;
}

export function ProgressIndicator({ trend, percentage, totalAnalyses }: ProgressIndicatorProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-8 h-8" style={{ color: '#10b981' }} />;
      case 'declining':
        return <TrendingDown className="w-8 h-8" style={{ color: '#ef4444' }} />;
      case 'stable':
        return <Minus className="w-8 h-8" style={{ color: TEXT_MUTED }} />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'improving':
        return '#10b981';
      case 'declining':
        return '#ef4444';
      case 'stable':
        return TEXT_MUTED;
    }
  };

  const getTrendMessage = () => {
    if (totalAnalyses < 2) {
      return 'Complete more analyses to track your progress';
    }

    switch (trend) {
      case 'improving':
        return `Your prompting quality has improved by ${percentage.toFixed(1)}%! Keep up the great work.`;
      case 'declining':
        return `Your prompting quality has declined by ${percentage.toFixed(1)}%. Review your recent suggestions to improve.`;
      case 'stable':
        return 'Your prompting quality is consistent. Try implementing suggestions to improve further.';
    }
  };

  const getTrendBorderColor = () => {
    switch (trend) {
      case 'improving':
        return 'rgba(16, 185, 129, 0.4)';
      case 'declining':
        return 'rgba(239, 68, 68, 0.4)';
      case 'stable':
        return BORDER;
    }
  };

  const getTrendBgColor = () => {
    switch (trend) {
      case 'improving':
        return 'rgba(16, 185, 129, 0.08)';
      case 'declining':
        return 'rgba(239, 68, 68, 0.08)';
      case 'stable':
        return CARD_BG;
    }
  };

  return (
    <div
      className="rounded-lg p-6"
      style={{
        backgroundColor: getTrendBgColor(),
        border: `2px solid ${getTrendBorderColor()}`,
      }}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">{getTrendIcon()}</div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2" style={{ color: getTrendColor() }}>
            {trend === 'improving' && "🎉 You're Improving!"}
            {trend === 'declining' && '⚠️ Room for Improvement'}
            {trend === 'stable' && '📊 Steady Progress'}
          </h3>
          <p style={{ color: TEXT_PRIMARY }}>{getTrendMessage()}</p>
          <div className="mt-4 text-sm" style={{ color: TEXT_MUTED }}>
            <span className="font-medium">Total Analyses:</span> {totalAnalyses}
          </div>
        </div>
      </div>
    </div>
  );
}
