import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ProgressIndicatorProps {
  trend: 'improving' | 'declining' | 'stable';
  percentage: number;
  totalAnalyses: number;
}

export function ProgressIndicator({ trend, percentage, totalAnalyses }: ProgressIndicatorProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-8 h-8 text-green-500" />;
      case 'declining':
        return <TrendingDown className="w-8 h-8 text-red-500" />;
      case 'stable':
        return <Minus className="w-8 h-8 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'improving':
        return 'text-green-600';
      case 'declining':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-600';
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

  const getTrendBgColor = () => {
    switch (trend) {
      case 'improving':
        return 'bg-green-50 border-green-200';
      case 'declining':
        return 'bg-red-50 border-red-200';
      case 'stable':
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`rounded-lg border-2 p-6 ${getTrendBgColor()}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">{getTrendIcon()}</div>
        <div className="flex-1">
          <h3 className={`text-lg font-semibold mb-2 ${getTrendColor()}`}>
            {trend === 'improving' && "🎉 You're Improving!"}
            {trend === 'declining' && '⚠️ Room for Improvement'}
            {trend === 'stable' && '📊 Steady Progress'}
          </h3>
          <p className="text-gray-700">{getTrendMessage()}</p>
          <div className="mt-4 text-sm text-gray-600">
            <span className="font-medium">Total Analyses:</span> {totalAnalyses}
          </div>
        </div>
      </div>
    </div>
  );
}
