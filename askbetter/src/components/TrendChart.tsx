import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { AnalysisHistory } from '../lib/dashboardService';

interface TrendChartProps {
  history: AnalysisHistory[];
}

export function TrendChart({ history }: TrendChartProps) {
  // Transform history data for the chart
  const chartData = history.map((analysis, index) => ({
    analysis: `#${index + 1}`,
    date: new Date(analysis.created_at).toLocaleDateString(),
    Autonomy: Math.round(analysis.scores.autonomy),
    Curiosity: Math.round(analysis.scores.curiosity),
    'Critical Thinking': Math.round(analysis.scores.criticalThinking),
    Specificity: Math.round(analysis.scores.specificity),
    Context: Math.round(analysis.scores.context),
    Engagement: Math.round(analysis.scores.engagement),
    Overall: Math.round(analysis.scores.overallQuality),
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No analysis history yet. Complete your first analysis to see trends!
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="analysis" stroke="#6b7280" />
        <YAxis domain={[0, 100]} stroke="#6b7280" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
        />
        <Legend />
        <Line type="monotone" dataKey="Overall" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
        <Line type="monotone" dataKey="Autonomy" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="Curiosity" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
        <Line
          type="monotone"
          dataKey="Critical Thinking"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="Specificity"
          stroke="#ef4444"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line type="monotone" dataKey="Context" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} />
        <Line
          type="monotone"
          dataKey="Engagement"
          stroke="#06b6d4"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
