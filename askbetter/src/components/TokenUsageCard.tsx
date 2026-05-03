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
  providerLabel?: string;
  methodNote?: string;
  warningNote?: string;
  isLoading?: boolean;
  revisedTokens?: number | null;
  revisedCost?: number | null;
  className?: string;
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
  revisedTokens,
  revisedCost,
  className = '',
}: TokenUsageCardProps) {
  const displayLabel = providerLabel ?? label;

  return (
    <div
      className={`rounded-2xl p-5 mb-4 ${className}`}
      style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
    >
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-3">
        <Coins className="w-3.5 h-3.5" style={{ color: TEXT_MUTED }} />
        <div>
          <p
            className="text-[10px] font-semibold tracking-widest uppercase"
            style={{ color: TEXT_MUTED }}
          >
            Token Estimation
          </p>
          <h2 className="text-sm font-black uppercase" style={{ color: TEXT_PRIMARY }}>
            Estimated Token Usage
          </h2>
        </div>
      </div>

      {/* Warning banner */}
      {warningNote && (
        <div
          className="flex items-start gap-2 rounded-lg p-3 mb-3"
          style={{
            backgroundColor: 'rgba(251, 146, 60, 0.08)',
            border: '1px solid rgba(251, 146, 60, 0.25)',
            borderLeft: '3px solid #fb923c',
          }}
        >
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#fb923c' }} />
          <p className="text-xs leading-relaxed" style={{ color: '#fed7aa' }}>
            {warningNote}
          </p>
        </div>
      )}

      {/* Totals row */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div
          className="rounded-lg p-3"
          style={{ backgroundColor: 'rgba(124,58,237,0.1)', border: `1px solid ${BORDER}` }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
            style={{ color: TEXT_DIM }}
          >
            Total Tokens
          </p>
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: TEXT_MUTED }} />
          ) : (
            <p className="text-xl font-black" style={{ color: TEXT_PRIMARY }}>
              {formatTokenCount(totalTokens)}
            </p>
          )}
        </div>
        <div
          className="rounded-lg p-3"
          style={{ backgroundColor: 'rgba(124,58,237,0.1)', border: `1px solid ${BORDER}` }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
            style={{ color: TEXT_DIM }}
          >
            Estimated Cost
          </p>
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: TEXT_MUTED }} />
          ) : (
            <p className="text-xl font-black" style={{ color: TEXT_PRIMARY }}>
              {formatCostUsd(estimatedCostUsd)}
            </p>
          )}
        </div>
      </div>

      {/* Method note */}
      {methodNote && (
        <p className="text-[10px] mb-2" style={{ color: TEXT_MUTED }}>
          {methodNote}
        </p>
      )}

      {/* Average tokens per prompt */}
      {breakdown.length > 0 && (
        <div className="mb-3">
          <div
            className="flex items-center justify-between rounded-lg px-3 py-2"
            style={{ backgroundColor: 'rgba(124,58,237,0.06)', border: `1px solid ${BORDER}` }}
          >
            <span className="text-xs font-medium" style={{ color: TEXT_MUTED }}>
              Avg. Tokens per Prompt
            </span>
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: TEXT_MUTED }} />
            ) : (
              <span className="text-xs font-bold" style={{ color: TEXT_PRIMARY }}>
                {formatTokenCount(
                  Math.round(
                    breakdown.reduce((sum, e) => sum + e.tokens, 0) / breakdown.length
                  )
                )}{' '}
                tokens
              </span>
            )}
          </div>
        </div>
      )}

      {/* Revised prompt comparison */}
      {revisedTokens != null && revisedCost != null && (
        <div className="mb-3">
          <p
            className="text-[10px] font-semibold tracking-widest uppercase mb-2"
            style={{ color: '#4ade80' }}
          >
            ✨ Revised Prompt
          </p>
          <div className="h-px mb-2" style={{ backgroundColor: 'rgba(34, 197, 94, 0.25)' }} />
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div
              className="rounded-lg p-3"
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
              }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
                style={{ color: '#6b7280' }}
              >
                Revised Tokens
              </p>
              <p className="text-xl font-black" style={{ color: '#4ade80' }}>
                {formatTokenCount(revisedTokens)}
              </p>
            </div>
            <div
              className="rounded-lg p-3"
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
              }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
                style={{ color: '#6b7280' }}
              >
                Revised Cost
              </p>
              <p className="text-xl font-black" style={{ color: '#4ade80' }}>
                {formatCostUsd(revisedCost)}
              </p>
            </div>
          </div>
          {(() => {
            const diff = revisedTokens - totalTokens;
            const pct = totalTokens > 0 ? Math.round((diff / totalTokens) * 100) : 0;
            const isMore = diff > 0;
            return (
              <div
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{
                  backgroundColor: isMore
                    ? 'rgba(251, 146, 60, 0.08)'
                    : 'rgba(34, 197, 94, 0.08)',
                  border: `1px solid ${isMore ? 'rgba(251, 146, 60, 0.25)' : 'rgba(34, 197, 94, 0.25)'}`,
                }}
              >
                <span className="text-[10px] font-medium" style={{ color: TEXT_MUTED }}>
                  vs. Original
                </span>
                <span
                  className="text-[10px] font-bold"
                  style={{ color: isMore ? '#fb923c' : '#4ade80' }}
                >
                  {isMore ? '+' : ''}
                  {formatTokenCount(diff)} tokens ({isMore ? '+' : ''}
                  {pct}%)
                </span>
              </div>
            );
          })()}
        </div>
      )}

      {/* Label */}
      <p className="text-[10px] mb-1" style={{ color: TEXT_DIM }}>
        {displayLabel}
      </p>

      {/* Disclaimer */}
      <p className="text-[10px]" style={{ color: TEXT_DIM }}>
        {disclaimer}
      </p>
    </div>
  );
}
