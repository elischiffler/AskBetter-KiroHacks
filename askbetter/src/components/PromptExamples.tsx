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
  delegation: 'bg-red-900/40 text-red-300 border-red-800/50',
  curiosity: 'bg-blue-900/40 text-blue-300 border-blue-800/50',
  collaborative: 'bg-emerald-900/40 text-emerald-300 border-emerald-800/50',
  verification: 'bg-amber-900/40 text-amber-300 border-amber-800/50',
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
    <div className="bg-slate-700/50 rounded-xl p-3 border border-slate-600/50">
      <p className="text-sm text-slate-200 leading-relaxed">{truncated}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span
          className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${intentColors[prompt.primaryIntent]}`}
        >
          {intentLabels[prompt.primaryIntent]}
        </span>
        {notableFlags.map((f) => (
          <span
            key={f}
            className="inline-block text-xs px-2 py-0.5 rounded-full border bg-indigo-900/40 text-indigo-300 border-indigo-800/50 font-medium"
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
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
      <h2 className="text-lg font-semibold text-white mb-4">Prompt Examples</h2>
      <div className="grid md:grid-cols-2 gap-6">
        {hasPassive && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-sm font-medium text-slate-300">Passive Prompts</span>
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
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm font-medium text-slate-300">Active Prompts</span>
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
