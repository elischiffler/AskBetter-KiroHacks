import type { AnalyzedPrompt } from '../analysis/types';

interface PromptExamplesProps {
  passiveExamples: AnalyzedPrompt[];
  activeExamples: AnalyzedPrompt[];
}

const intentLabels: Record<string, string> = {
  delegation: 'Delegation',
  curiosity: 'Curiosity',
  collaborative: 'Collaborative',
  verification: 'Verification',
};

const intentColors: Record<string, string> = {
  delegation: 'rgba(124,58,237,0.2)',
  curiosity: 'rgba(167,139,250,0.15)',
  collaborative: 'rgba(196,181,253,0.12)',
  verification: 'rgba(109,40,217,0.2)',
};

const intentTextColors: Record<string, string> = {
  delegation: '#c4b5fd',
  curiosity: '#a78bfa',
  collaborative: '#ddd6fe',
  verification: '#a78bfa',
};

const flagLabels: Record<string, string> = {
  delegation_with_learning_intent: 'Learning intent',
  shows_prior_attempt: 'Shows attempt',
  asks_for_reasoning: 'Asks for reasoning',
  asks_for_alternatives: 'Asks for alternatives',
  asks_for_risk_or_limitations: 'Asks for risks',
};

function PromptBubble({ prompt }: { prompt: AnalyzedPrompt }) {
  const truncated = prompt.text.length > 200 ? prompt.text.slice(0, 200) + '…' : prompt.text;
  const notableFlags = prompt.flags.filter((f) => flagLabels[f]);

  return (
    <div
      className="rounded-xl p-3"
      style={{
        backgroundColor: 'rgba(124,58,237,0.08)',
        border: '1px solid rgba(139,92,246,0.2)',
      }}
    >
      <p className="text-sm leading-relaxed" style={{ color: '#f5f3ff' }}>
        {truncated}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span
          className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            backgroundColor: intentColors[prompt.primaryIntent] ?? 'rgba(124,58,237,0.2)',
            color: intentTextColors[prompt.primaryIntent] ?? '#c4b5fd',
            border: '1px solid rgba(139,92,246,0.3)',
          }}
        >
          {intentLabels[prompt.primaryIntent]}
        </span>
        {notableFlags.map((f) => (
          <span
            key={f}
            className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: 'rgba(167,139,250,0.1)',
              color: '#a78bfa',
              border: '1px solid rgba(139,92,246,0.25)',
            }}
          >
            {flagLabels[f]}
          </span>
        ))}
      </div>
    </div>
  );
}

export function PromptExamples({ passiveExamples, activeExamples }: PromptExamplesProps) {
  const hasPassive = passiveExamples.length > 0;
  const hasActive = activeExamples.length > 0;

  if (!hasPassive && !hasActive) return null;

  return (
    <div
      className="rounded-2xl p-6"
      style={{ backgroundColor: '#1a1030', border: '1px solid rgba(139,92,246,0.25)' }}
    >
      <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#a78bfa' }}>
        Prompt Examples
      </h2>
      <div className="grid md:grid-cols-2 gap-6">
        {hasPassive && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#fb923c' }} />
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: '#6b5fa0' }}
              >
                Passive Prompts
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {passiveExamples.map((p, i) => (
                <PromptBubble key={i} prompt={p} />
              ))}
            </div>
          </div>
        )}
        {hasActive && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#a78bfa' }} />
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: '#6b5fa0' }}
              >
                Active Prompts
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {activeExamples.map((p, i) => (
                <PromptBubble key={i} prompt={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
