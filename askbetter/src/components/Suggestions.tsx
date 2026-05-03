import { Lightbulb } from 'lucide-react';

interface SuggestionsProps {
  summary: string;
  suggestions: string[];
}

export function Suggestions({ summary, suggestions }: SuggestionsProps) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ backgroundColor: '#1a1030', border: '1px solid rgba(139,92,246,0.25)' }}
    >
      <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#a78bfa' }}>
        Summary
      </h2>
      <p className="text-sm leading-relaxed mb-6" style={{ color: '#a78bfa' }}>
        {summary}
      </p>

      {suggestions.length > 0 && (
        <>
          <h3
            className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
            style={{ color: '#a78bfa' }}
          >
            <Lightbulb className="w-4 h-4" style={{ color: '#c4b5fd' }} />
            How to improve
          </h3>
          <ul className="flex flex-col gap-3">
            {suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="shrink-0 w-6 h-6 rounded-full text-xs flex items-center justify-center font-black mt-0.5"
                  style={{
                    backgroundColor: 'rgba(124,58,237,0.3)',
                    color: '#c4b5fd',
                    border: '1px solid rgba(139,92,246,0.4)',
                  }}
                >
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed" style={{ color: '#a78bfa' }}>
                  {s}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
