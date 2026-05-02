import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Clock, Target, CheckCircle, AlertCircle } from "lucide-react";
import type { AnalysisResult } from "../analysis/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function estimateDuration(promptCount: number): string {
  const minutes = Math.max(1, Math.round(promptCount * 0.8));
  return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
}

// Color per category bar
const CATEGORY_COLORS: Record<string, string> = {
  Delegation: "#4338ca",
  Curiosity: "#9333ea",
  Collaborative: "#3b82f6",
  Verification: "#22c55e",
};

// Color per score bar
const SCORE_COLORS: Record<string, string> = {
  autonomy: "#4338ca",
  curiosity: "#9333ea",
  criticalThinking: "#f97316",
  engagement: "#3b82f6",
};

// ── sub-components ────────────────────────────────────────────────────────────

interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
  suffix?: string;
}

function ProgressBar({ label, value, max, color, suffix }: ProgressBarProps) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm font-semibold" style={{ color }}>
          {suffix ? `${value}${suffix}` : `${value}%`}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

interface FeedbackCardProps {
  type: "positive" | "warning";
  title: string;
  description: string;
}

function FeedbackCard({ type, title, description }: FeedbackCardProps) {
  const isPositive = type === "positive";
  return (
    <div
      className="rounded-2xl p-5 mb-3 border-l-4"
      style={{
        backgroundColor: isPositive ? "#f0fdf4" : "#fffbeb",
        borderLeftColor: isPositive ? "#22c55e" : "#f97316",
      }}
    >
      <div className="flex items-start gap-3">
        {isPositive ? (
          <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "#16a34a" }} />
        ) : (
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "#ea580c" }} />
        )}
        <div>
          <p
            className="font-semibold text-sm mb-1"
            style={{ color: isPositive ? "#15803d" : "#c2410c" }}
          >
            {title}
          </p>
          <p
            className="text-sm leading-relaxed"
            style={{ color: isPositive ? "#166534" : "#9a3412" }}
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result as AnalysisResult | undefined;

  if (!result) {
    navigate("/");
    return null;
  }

  const totalMessages = result.prompts.length;
  const duration = estimateDuration(totalMessages);

  // Build category breakdown from distribution
  const categoryTotal = result.distribution.reduce((s, d) => s + d.value, 0);
  const categories = result.distribution.map((d) => ({
    name: d.name,
    pct: categoryTotal > 0 ? Math.round((d.value / categoryTotal) * 100) : 0,
    color: CATEGORY_COLORS[d.name] ?? d.color,
  }));

  // Scores to show
  const scoreItems = [
    { key: "autonomy", label: "Autonomy", value: result.scores.autonomy },
    { key: "curiosity", label: "Curiosity", value: result.scores.curiosity },
    { key: "criticalThinking", label: "Critical Thinking", value: result.scores.criticalThinking },
    { key: "engagement", label: "Engagement", value: result.scores.engagement },
  ];

  // Feedback cards: patterns → positive/warning
  const positivePatterns = result.patterns.filter((p) => p.severity === "positive");
  const warningPatterns = result.patterns.filter((p) => p.severity === "warning");

  // Merge suggestions as warning cards if no warning patterns
  const feedbackItems: FeedbackCardProps[] = [
    ...positivePatterns.map((p) => ({
      type: "positive" as const,
      title: p.label,
      description: p.description,
    })),
    ...warningPatterns.map((p) => ({
      type: "warning" as const,
      title: p.label,
      description: p.description,
    })),
    // Fall back to suggestions if no patterns
    ...(positivePatterns.length === 0 && warningPatterns.length === 0
      ? result.suggestions.map((s, i) => ({
          type: (i % 2 === 0 ? "positive" : "warning") as "positive" | "warning",
          title: i === 0 ? "Suggestion" : "Improvement",
          description: s,
        }))
      : []),
  ];

  return (
    <div
      className="min-h-screen px-4 py-6"
      style={{ background: "linear-gradient(135deg, #e8eaf6 0%, #ede9f7 50%, #e3e8f5 100%)" }}
    >
      <div className="max-w-xl mx-auto">
        {/* Back nav */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 mb-5 text-sm font-semibold transition hover:opacity-70"
          style={{ color: "#4338ca" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Analyze Another Chat
        </button>

        {/* Main results card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/60 p-8 mb-4">
          <h1 className="text-2xl font-bold mb-6" style={{ color: "#1e1b4b" }}>
            Chat Analysis Results
          </h1>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="rounded-2xl p-4" style={{ backgroundColor: "#f0f4ff" }}>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4" style={{ color: "#6366f1" }} />
                <span className="text-sm text-gray-500">Total Messages</span>
              </div>
              <p className="text-3xl font-bold" style={{ color: "#1e1b4b" }}>
                {totalMessages}
              </p>
            </div>
            <div className="rounded-2xl p-4" style={{ backgroundColor: "#f5f0ff" }}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4" style={{ color: "#9333ea" }} />
                <span className="text-sm text-gray-500">Duration</span>
              </div>
              <p className="text-xl font-bold" style={{ color: "#7c3aed" }}>
                {duration}
              </p>
            </div>
          </div>

          {/* Category breakdown */}
          <h2 className="text-base font-bold mb-4" style={{ color: "#1e1b4b" }}>
            Prompt Category Breakdown
          </h2>
          {categories.map((c) => (
            <ProgressBar
              key={c.name}
              label={c.name}
              value={c.pct}
              max={100}
              color={c.color}
            />
          ))}

          {/* Divider */}
          <div className="h-px bg-gray-100 my-6" />

          {/* Score bars */}
          {scoreItems.map((s) => (
            <ProgressBar
              key={s.key}
              label={s.label}
              value={s.value}
              max={100}
              color={SCORE_COLORS[s.key] ?? "#4338ca"}
              suffix="/100"
            />
          ))}
        </div>

        {/* Feedback card */}
        {feedbackItems.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/60 p-8 mb-4">
            <div className="flex items-center gap-3 mb-5">
              <Target className="w-5 h-5" style={{ color: "#4338ca" }} />
              <h2 className="text-lg font-bold" style={{ color: "#1e1b4b" }}>
                Feedback &amp; Recommendations
              </h2>
            </div>
            {feedbackItems.map((item, i) => (
              <FeedbackCard key={i} {...item} />
            ))}
          </div>
        )}

        {/* Summary card */}
        {result.summary && (
          <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/60 p-8 mb-4">
            <h2 className="text-base font-bold mb-3" style={{ color: "#1e1b4b" }}>
              Summary
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">{result.summary}</p>
          </div>
        )}

      </div>
    </div>
  );
}
