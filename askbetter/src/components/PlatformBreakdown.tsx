// ── design tokens ─────────────────────────────────────────────────────────────
const TEXT_PRIMARY = '#f5f3ff';
const TEXT_MUTED = '#a78bfa';

const PLATFORM_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  chatgpt: { label: 'ChatGPT', color: '#10b981', icon: '🤖' },
  gemini: { label: 'Gemini', color: '#3b82f6', icon: '✨' },
  perplexity: { label: 'Perplexity', color: '#8b5cf6', icon: '🔍' },
  unknown: { label: 'Other', color: '#6b7280', icon: '💬' },
};

interface PlatformBreakdownProps {
  breakdown: Record<string, number>;
  total: number;
}

export function PlatformBreakdown({ breakdown, total }: PlatformBreakdownProps) {
  if (total === 0) return null;

  const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      {entries.map(([platform, count]) => {
        const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.unknown;
        const percentage = Math.round((count / total) * 100);

        return (
          <div key={platform}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{config.icon}</span>
                <span className="text-sm font-medium" style={{ color: TEXT_PRIMARY }}>
                  {config.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: config.color }}>
                  {count}
                </span>
                <span className="text-xs" style={{ color: TEXT_MUTED }}>
                  ({percentage}%)
                </span>
              </div>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'rgba(139, 92, 246, 0.12)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${percentage}%`, backgroundColor: config.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
