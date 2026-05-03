import { Coins, Loader2, AlertTriangle } from 'lucide-react';
import type { TokenBreakdownEntry } from '../analysis/types';

// ── design tokens (matching ResultsPage) ──────────────────────────────────────

const CARD_BG = '#1a1030';
const BORDER = 'rgba(139, 92, 246, 0.25)';
const TEXT_PRIMARY = '#f5f3ff';
const TEXT_MUTED = '#a78bfa';
const TEXT_DIM = '#6b5fa0';

// ── props ─────────────────────────────────────────────────────────────────────

interface TokenUsageCardProps {
  totalTokens: number;
  estimatedCostUsd: number;
  breakdown: TokenBreakdownEntry[];
  label: string;
  disclaimer: string;
  /** Provider name + model shown as the estimation label (e.g. "Gemini · gemini-2.5-pro") */
  providerLabel?: string;
  /** Estimation method note displayed below the token count */
  methodNote?: string;
  /** Warning banner text when a provider API fell back to local estimation */
  warningNote?: string;
  /** Show a loading spinner in place of token count values */
  isLoading?: boolean;
}

// ── formatting helpers ────────────────────────────────────────────────────────

function formatTokenCount(tokens: number): string {
  return tokens.toLocaleString();
}

function formatCostUsd(cost: number): string {
  return `$${cost.toFixed(6)}`;
}

// ── component ─────────────────────────────────────────────────────────────────

export function TokenUsageCard({
  totalTokens,
  estimatedCostUsd,
  breakdown,
  label,
  disclaimer,
  providerLabel,
  methodNote,
  warningNote,
  isLoading,
}: TokenUsageCardProps) {
  const displayLabel = providerLabel ?? label;

  return (
    <div
      className="rounded-2xl p-8 mb-4"
      style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
    >
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <Coins className="w-4 h-4" style={{ color: TEXT_MUTED }} />
        <div>
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-1"
            style={{ color: TEXT_MUTED }}
          >
            Token Estimation
          </p>
          <h2 className="text-base font-black uppercase" style={{ color: TEXT_PRIMARY }}>
            Estimated Token Usage
          </h2>
        </div>
      </div>

      {/* Warning banner (amber/orange) when fallback occurred */}
      {warningNote && (
        <div
          className="flex items-start gap-3 rounded-xl p-4 mb-6"
          style={{
            backgroundColor: 'rgba(251, 146, 60, 0.08)',
            border: '1px solid rgba(251, 146, 60, 0.25)',
            borderLeft: '3px solid #fb923c',
          }}
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#fb923c' }} />
          <p className="text-sm leading-relaxed" style={{ color: '#fed7aa' }}>
            {warningNote}
          </p>
        </div>
      )}

      {/* Totals row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: 'rgba(124,58,237,0.1)', border: `1px solid ${BORDER}` }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-1"
            style={{ color: TEXT_DIM }}
          >
            Total Tokens
          </p>
          {isLoading ? (
            <div className="flex items-center gap-2 h-8">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: TEXT_MUTED }} />
            </div>
          ) : (
            <p className="text-2xl font-black" style={{ color: TEXT_PRIMARY }}>
              {formatTokenCount(totalTokens)}
            </p>
          )}
        </div>
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: 'rgba(124,58,237,0.1)', border: `1px solid ${BORDER}` }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-1"
            style={{ color: TEXT_DIM }}
          >
            Estimated Cost
          </p>
          {isLoading ? (
            <div className="flex items-center gap-2 h-8">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: TEXT_MUTED }} />
            </div>
          ) : (
            <p className="text-2xl font-black" style={{ color: TEXT_PRIMARY }}>
              {formatCostUsd(estimatedCostUsd)}
            </p>
          )}
        </div>
      </div>

      {/* Method note (displayed below the totals when set) */}
      {methodNote && (
        <p className="text-xs mb-4" style={{ color: TEXT_MUTED }}>
          {methodNote}
        </p>
      )}

      {/* Per-prompt breakdown */}
      {breakdown.length > 0 && (
        <div className="mb-6">
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-3"
            style={{ color: TEXT_MUTED }}
          >
            Per-Prompt Breakdown
          </p>
          <div className="h-px mb-3" style={{ backgroundColor: BORDER }} />
          <div className="space-y-2">
            {isLoading
              ? breakdown.map((entry) => (
                  <div
                    key={entry.index}
                    className="flex items-center justify-between rounded-lg px-4 py-2"
                    style={{
                      backgroundColor: 'rgba(124,58,237,0.06)',
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    <span className="text-sm font-medium" style={{ color: TEXT_MUTED }}>
                      Prompt {entry.index + 1}
                    </span>
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: TEXT_MUTED }} />
                  </div>
                ))
              : breakdown.map((entry) => (
                  <div
                    key={entry.index}
                    className="flex items-center justify-between rounded-lg px-4 py-2"
                    style={{
                      backgroundColor: 'rgba(124,58,237,0.06)',
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    <span className="text-sm font-medium" style={{ color: TEXT_MUTED }}>
                      Prompt {entry.index + 1}
                    </span>
                    <span className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>
                      {formatTokenCount(entry.tokens)} tokens
                    </span>
                  </div>
                ))}
          </div>
        </div>
      )}

      {/* Label (uses providerLabel when set, otherwise the default label) */}
      <p className="text-xs mb-2" style={{ color: TEXT_DIM }}>
        {displayLabel}
      </p>

      {/* Disclaimer */}
      <p className="text-xs" style={{ color: TEXT_DIM }}>
        {disclaimer}
      </p>
    </div>
  );
}
