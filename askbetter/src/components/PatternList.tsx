import { CheckCircle, AlertTriangle, Info } from "lucide-react";
import type { DetectedPattern } from "../analysis/types";

interface PatternListProps {
  patterns: DetectedPattern[];
}

const severityConfig = {
  positive: {
    icon: CheckCircle,
    iconColor: "text-emerald-400",
    bg: "bg-emerald-950/40",
    border: "border-emerald-800/50",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-amber-400",
    bg: "bg-amber-950/40",
    border: "border-amber-800/50",
  },
  neutral: {
    icon: Info,
    iconColor: "text-blue-400",
    bg: "bg-blue-950/40",
    border: "border-blue-800/50",
  },
};

export function PatternList({ patterns }: PatternListProps) {
  if (patterns.length === 0) {
    return (
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-4">
          Detected Patterns
        </h2>
        <p className="text-slate-400 text-sm">No patterns detected.</p>
      </div>
    );
  }

  const positives = patterns.filter((p) => p.severity === "positive");
  const warnings = patterns.filter((p) => p.severity === "warning");

  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
      <h2 className="text-lg font-semibold text-white mb-4">
        Detected Patterns
      </h2>
      <div className="flex flex-col gap-3">
        {[...warnings, ...positives].map((pattern) => {
          const config = severityConfig[pattern.severity];
          const Icon = config.icon;
          return (
            <div
              key={pattern.id}
              className={`flex items-start gap-3 rounded-xl p-3 border ${config.bg} ${config.border}`}
            >
              <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${config.iconColor}`} />
              <div>
                <div className="text-sm font-medium text-white">
                  {pattern.label}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
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
