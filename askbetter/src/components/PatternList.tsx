import { CheckCircle, AlertTriangle, Info } from 'lucide-react';
import type { DetectedPattern } from '../analysis/types';

interface PatternListProps {
  patterns: DetectedPattern[];
}

const severityConfig = {
  positive: {
    icon: CheckCircle,
    iconColor: '#a78bfa',
    bg: 'rgba(124,58,237,0.1)',
    border: 'rgba(124,58,237,0.3)',
    accentBorder: '#7c3aed',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: '#fb923c',
    bg: 'rgba(251,146,60,0.08)',
    border: 'rgba(251,146,60,0.25)',
    accentBorder: '#fb923c',
  },
  neutral: {
    icon: Info,
    iconColor: '#c4b5fd',
    bg: 'rgba(196,181,253,0.08)',
    border: 'rgba(196,181,253,0.2)',
    accentBorder: '#c4b5fd',
  },
};

export function PatternList({ patterns }: PatternListProps) {
  if (patterns.length === 0) {
    return (
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: '#1a1030', border: '1px solid rgba(139,92,246,0.25)' }}
      >
        <h2
          className="text-xs font-bold uppercase tracking-widest mb-4"
          style={{ color: '#a78bfa' }}
        >
          Detected Patterns
        </h2>
        <p className="text-sm" style={{ color: '#6b5fa0' }}>
          No patterns detected.
        </p>
      </div>
    );
  }

  const positives = patterns.filter((p) => p.severity === 'positive');
  const warnings = patterns.filter((p) => p.severity === 'warning');

  return (
    <div
      className="rounded-2xl p-6"
      style={{ backgroundColor: '#1a1030', border: '1px solid rgba(139,92,246,0.25)' }}
    >
      <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#a78bfa' }}>
        Detected Patterns
      </h2>
      <div className="flex flex-col gap-3">
        {[...warnings, ...positives].map((pattern) => {
          const config = severityConfig[pattern.severity];
          const Icon = config.icon;
          return (
            <div
              key={pattern.id}
              className="flex items-start gap-3 rounded-xl p-3"
              style={{
                backgroundColor: config.bg,
                border: `1px solid ${config.border}`,
                borderLeft: `3px solid ${config.accentBorder}`,
              }}
            >
              <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: config.iconColor }} />
              <div>
                <div className="text-sm font-semibold" style={{ color: '#f5f3ff' }}>
                  {pattern.label}
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#a78bfa' }}>
                  {pattern.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
