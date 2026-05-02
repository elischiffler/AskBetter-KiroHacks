import type { ConversationScores } from "../lib/types";

interface ScoreCardProps {
  scores: ConversationScores;
}

interface ScoreItemProps {
  label: string;
  score: number;
  description: string;
  color: string;
}

function ScoreItem({ label, score, description, color }: ScoreItemProps) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2 p-4">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
          {/* Background circle */}
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="#1e293b"
            strokeWidth="7"
          />
          {/* Progress circle */}
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-white">{score}</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="text-xs text-slate-400 mt-0.5 max-w-[120px]">
          {description}
        </div>
      </div>
    </div>
  );
}

export function ScoreCard({ scores }: ScoreCardProps) {
  const items = [
    {
      label: "Autonomy",
      score: scores.autonomy,
      description: "Active thinking vs. offloading",
      color: "#818cf8",
    },
    {
      label: "Curiosity",
      score: scores.curiosity,
      description: "Exploratory follow-up questions",
      color: "#60a5fa",
    },
    {
      label: "Critical Thinking",
      score: scores.criticalThinking,
      description: "Verification & reasoning",
      color: "#34d399",
    },
    {
      label: "Engagement",
      score: scores.engagement,
      description: "Iteration & depth",
      color: "#fbbf24",
    },
  ];

  const overall = Math.round(
    (scores.autonomy +
      scores.curiosity +
      scores.criticalThinking +
      scores.engagement) /
      4,
  );

  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Your Scores</h2>
        <div className="flex items-center gap-2 bg-slate-700 rounded-full px-4 py-1.5">
          <span className="text-slate-400 text-sm">Overall</span>
          <span className="text-white font-bold text-lg">{overall}</span>
          <span className="text-slate-400 text-sm">/100</span>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {items.map((item) => (
          <ScoreItem key={item.label} {...item} />
        ))}
      </div>
    </div>
  );
}
