import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ExternalLink } from 'lucide-react';
import type { AnalysisHistory } from '../lib/dashboardService';

// ── design tokens ─────────────────────────────────────────────────────────────
const CARD_BG = '#1a1030';
const BORDER = 'rgba(139, 92, 246, 0.25)';
const TEXT_PRIMARY = '#f5f3ff';
const TEXT_MUTED = '#a78bfa';

type TimeFrame = '1d' | '1w' | '1m' | 'all';

const TIME_FRAME_LABELS: Record<TimeFrame, string> = {
  '1d': '24h',
  '1w': '7 days',
  '1m': '30 days',
  all: 'All',
};

interface TrendChartProps {
  history: AnalysisHistory[];
}

interface ChartDataPoint {
  timestamp: number;
  dateLabel: string;
  fullDate: string;
  index: number;
  Autonomy: number;
  Curiosity: number;
  'Critical Thinking': number;
  Specificity: number;
  Context: number;
  Engagement: number;
  Overall: number;
  historyItem: AnalysisHistory;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateWithTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatTooltipDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getFilteredHistory(history: AnalysisHistory[], timeFrame: TimeFrame): AnalysisHistory[] {
  if (timeFrame === 'all') return history;

  const now = Date.now();
  const msMap: Record<Exclude<TimeFrame, 'all'>, number> = {
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
    '1m': 30 * 24 * 60 * 60 * 1000,
  };

  const cutoff = now - msMap[timeFrame];
  return history.filter((a) => new Date(a.created_at).getTime() >= cutoff);
}

// Custom tooltip component with chat info and navigation
function CustomTooltip({ active, payload }: any) {
  const navigate = useNavigate();

  // Debug: log when tooltip is called
  console.log('Tooltip called:', { active, payloadLength: payload?.length, payload });

  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload as ChartDataPoint | undefined;
  if (!data) {
    console.log('No data in payload');
    return null;
  }

  const { historyItem, fullDate } = data;

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/results', { state: { result: historyItem.analysis_result } });
  };

  return (
    <div
      className="rounded-xl p-4 shadow-lg max-w-xs"
      style={{
        backgroundColor: CARD_BG,
        border: `1px solid ${BORDER}`,
        color: TEXT_PRIMARY,
        pointerEvents: 'auto',
      }}
    >
      {/* Header with title and redirect button */}
      <div
        className="flex items-start justify-between gap-3 mb-3 pb-3 border-b"
        style={{ borderColor: BORDER }}
      >
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-1"
            style={{ color: TEXT_MUTED }}
          >
            {fullDate}
          </p>
          <p className="text-sm font-semibold truncate" style={{ color: TEXT_PRIMARY }}>
            {historyItem.title}
          </p>
        </div>
        <button
          onClick={handleNavigate}
          className="shrink-0 p-1.5 rounded-lg transition-all hover:scale-110"
          style={{ backgroundColor: 'rgba(124, 58, 237, 0.2)', color: '#a78bfa' }}
          title="View full analysis"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* Chat info */}
      <div className="space-y-2 mb-3">
        <div className="flex justify-between text-xs">
          <span style={{ color: TEXT_MUTED }}>Prompts:</span>
          <span className="font-semibold" style={{ color: TEXT_PRIMARY }}>
            {historyItem.prompt_count}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span style={{ color: TEXT_MUTED }}>Overall Score:</span>
          <span className="font-bold" style={{ color: '#a78bfa' }}>
            {Math.round(historyItem.scores.overallQuality)}/100
          </span>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: BORDER }}>
        {payload.map((entry) => {
          if (entry.dataKey === 'Overall') return null;
          return (
            <div key={entry.dataKey} className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span style={{ color: TEXT_MUTED }}>{entry.dataKey}:</span>
              </div>
              <span className="font-semibold" style={{ color: TEXT_PRIMARY }}>
                {entry.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Custom legend component with perfect vertical alignment
function CustomLegend({ payload }: any) {
  if (!payload || payload.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
      {payload.map((entry: any, index: number) => (
        <div key={`legend-${index}`} className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-xs" style={{ color: entry.color }}>
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TrendChart({ history }: TrendChartProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('all');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: TEXT_MUTED }}>
        No analysis history yet. Complete your first analysis to see trends!
      </div>
    );
  }

  const filtered = getFilteredHistory(history, timeFrame);

  // Determine if we should show time based on timeframe
  const showTime = timeFrame === '1d' || (timeFrame === 'all' && filtered.length <= 5);

  const chartData: ChartDataPoint[] = filtered.map((analysis, index) => ({
    timestamp: new Date(analysis.created_at).getTime(),
    dateLabel: showTime ? formatDateWithTime(analysis.created_at) : formatDate(analysis.created_at),
    fullDate: formatTooltipDate(analysis.created_at),
    index: index,
    Autonomy: Math.round(analysis.scores.autonomy),
    Curiosity: Math.round(analysis.scores.curiosity),
    'Critical Thinking': Math.round(analysis.scores.criticalThinking),
    Specificity: Math.round(analysis.scores.specificity),
    Context: Math.round(analysis.scores.context),
    Engagement: Math.round(analysis.scores.engagement),
    Overall: Math.round(analysis.scores.overallQuality),
    historyItem: analysis,
  }));

  return (
    <div style={{ outline: 'none' }}>
      {/* Time frame toggle */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ backgroundColor: '#0f0a1e' }}>
        {(['1d', '1w', '1m', 'all'] as TimeFrame[]).map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeFrame(tf)}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
            style={
              timeFrame === tf
                ? { backgroundColor: '#7c3aed', color: TEXT_PRIMARY, outline: 'none' }
                : { color: TEXT_MUTED, backgroundColor: 'transparent', outline: 'none' }
            }
          >
            {TIME_FRAME_LABELS[tf]}
          </button>
        ))}
      </div>

      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-64" style={{ color: TEXT_MUTED }}>
          No analyses in this time period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            style={{ outline: 'none' }}
            onMouseMove={(state) => {
              if (state && state.isTooltipActive && state.activeTooltipIndex !== undefined) {
                setHoveredIndex(state.activeTooltipIndex);
              }
            }}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.15)" />
            <XAxis
              dataKey="index"
              stroke={TEXT_MUTED}
              style={{ fontSize: '12px' }}
              tick={{ fill: TEXT_MUTED }}
              tickFormatter={(index) => chartData[index]?.dateLabel || ''}
            />
            <YAxis domain={[0, 100]} stroke={TEXT_MUTED} style={{ fontSize: '12px' }} />

            {/* Vertical cursor line on hover */}
            {hoveredIndex !== null && chartData[hoveredIndex] && (
              <ReferenceLine
                x={chartData[hoveredIndex].index}
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="3 3"
                label=""
              />
            )}

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: 'rgba(139, 92, 246, 0.5)', strokeWidth: 2 }}
              wrapperStyle={{ outline: 'none', zIndex: 1000 }}
              isAnimationActive={false}
            />
            <Legend content={<CustomLegend />} />
            <Line
              type="monotone"
              dataKey="Overall"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 6,
                strokeWidth: 2,
                stroke: '#8b5cf6',
                fill: '#a78bfa',
                style: { cursor: 'pointer', outline: 'none' },
              }}
            />
            <Line
              type="monotone"
              dataKey="Autonomy"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 5,
                strokeWidth: 2,
                stroke: '#3b82f6',
                style: { outline: 'none' },
              }}
            />
            <Line
              type="monotone"
              dataKey="Curiosity"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 5,
                strokeWidth: 2,
                stroke: '#10b981',
                style: { outline: 'none' },
              }}
            />
            <Line
              type="monotone"
              dataKey="Critical Thinking"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 5,
                strokeWidth: 2,
                stroke: '#f59e0b',
                style: { outline: 'none' },
              }}
            />
            <Line
              type="monotone"
              dataKey="Specificity"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 5,
                strokeWidth: 2,
                stroke: '#ef4444',
                style: { outline: 'none' },
              }}
            />
            <Line
              type="monotone"
              dataKey="Context"
              stroke="#ec4899"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 5,
                strokeWidth: 2,
                stroke: '#ec4899',
                style: { outline: 'none' },
              }}
            />
            <Line
              type="monotone"
              dataKey="Engagement"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 5,
                strokeWidth: 2,
                stroke: '#06b6d4',
                style: { outline: 'none' },
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
