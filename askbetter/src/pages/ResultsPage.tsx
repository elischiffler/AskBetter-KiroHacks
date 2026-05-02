import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import type { AnalysisResult } from "../lib/types";
import { ScoreCard } from "../components/ScoreCard";
import { DistributionChart } from "../components/DistributionChart";
import { PatternList } from "../components/PatternList";
import { PromptExamples } from "../components/PromptExamples";
import { Suggestions } from "../components/Suggestions";
import { ChatPanel } from "../components/chat/ChatPanel";

export function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result as AnalysisResult | undefined;

  if (!result) {
    navigate("/");
    return null;
  }

  const systemPrompt = `You are a helpful AI coach for AskBetter, a tool that analyzes ChatGPT conversation quality. 
The user just analyzed their conversation and received the following results:

Scores: Autonomy ${result.scores.autonomy}/100, Curiosity ${result.scores.curiosity}/100, Critical Thinking ${result.scores.criticalThinking}/100, Engagement ${result.scores.engagement}/100

Summary: ${result.summary}

Suggestions: ${result.suggestions.join(' | ')}

Help the user understand their results and improve their prompting habits. Be encouraging and specific.`;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 sticky top-0 bg-slate-950/90 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="w-px h-4 bg-slate-700" />
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-white font-bold tracking-tight">
                AskBetter
              </span>
            </div>
          </div>
          <div className="text-slate-400 text-sm">
            {result.prompts.length} prompt
            {result.prompts.length !== 1 ? "s" : ""} analyzed
          </div>
        </div>
      </header>

      {/* Results */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">
            Your conversation analysis
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Here's how you're using AI — and how to get more out of it.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {/* Scores */}
          <ScoreCard scores={result.scores} />

          {/* Chart + Patterns side by side */}
          <div className="grid md:grid-cols-2 gap-6">
            <DistributionChart distribution={result.distribution} />
            <PatternList patterns={result.patterns} />
          </div>

          {/* Prompt examples */}
          <PromptExamples
            passiveExamples={result.passiveExamples}
            activeExamples={result.activeExamples}
          />

          {/* Summary + suggestions */}
          <Suggestions
            summary={result.summary}
            suggestions={result.suggestions}
          />

          {/* Chat with your coach */}
          <div>
            <h2 className="text-xl font-bold text-white mb-3">Chat with your coach</h2>
            <ChatPanel systemPrompt={systemPrompt} />
          </div>

          {/* Analyze another */}
          <div className="flex justify-center pb-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-medium px-6 py-3 rounded-xl border border-slate-700 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Analyze another conversation
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
