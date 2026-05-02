import { Lightbulb } from 'lucide-react';

interface SuggestionsProps {
  summary: string;
  suggestions: string[];
}

export function Suggestions({ summary, suggestions }: SuggestionsProps) {
  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
      <h2 className="text-lg font-semibold text-white mb-3">Summary</h2>
      <p className="text-slate-300 text-sm leading-relaxed mb-6">{summary}</p>

      {suggestions.length > 0 && (
        <>
          <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            How to improve
          </h3>
          <ul className="flex flex-col gap-3">
            {suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-300 leading-relaxed">{s}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
