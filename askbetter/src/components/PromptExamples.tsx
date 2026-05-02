import type { AnalyzedPrompt } from "../lib/types";

interface PromptExamplesProps {
  passiveExamples: AnalyzedPrompt[];
  activeExamples: AnalyzedPrompt[];
}

const categoryLabels: Record<string, string> = {
  delegation: "Delegation",
  curiosity: "Curiosity",
  collaborative: "Collaborative",
  verification: "Verification",
};

const categoryColors: Record<string, string> = {
  delegation: "bg-red-900/40 text-red-300 border-red-800/50",
  curiosity: "bg-blue-900/40 text-blue-300 border-blue-800/50",
  collaborative: "bg-emerald-900/40 text-emerald-300 border-emerald-800/50",
  verification: "bg-amber-900/40 text-amber-300 border-amber-800/50",
};

function PromptBubble({ prompt }: { prompt: AnalyzedPrompt }) {
  const truncated =
    prompt.text.length > 200 ? prompt.text.slice(0, 200) + "…" : prompt.text;

  return (
    <div className="bg-slate-700/50 rounded-xl p-3 border border-slate-600/50">
      <p className="text-sm text-slate-200 leading-relaxed">{truncated}</p>
      <div className="mt-2">
        <span
          className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${categoryColors[prompt.category]}`}
        >
          {categoryLabels[prompt.category]}
        </span>
      </div>
    </div>
  );
}

export function PromptExamples({
  passiveExamples,
  activeExamples,
}: PromptExamplesProps) {
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
              <span className="text-sm font-medium text-slate-300">
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
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm font-medium text-slate-300">
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
