import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ChevronRight, FileText } from "lucide-react";
import { parseConversation } from "../analysis/parser";
import { analyzeConversation } from "../analysis/analyzer";
import {
  SAMPLE_CONVERSATION,
  SAMPLE_PASSIVE_CONVERSATION,
  SAMPLE_DELEGATION_WITH_LEARNING,
  SAMPLE_VERIFICATION_CONVERSATION,
  SAMPLE_COPY_PASTE_CONVERSATION,
} from "../lib/sampleData";

interface SampleButton {
  label: string;
  data: string;
}

const SAMPLES: SampleButton[] = [
  { label: "Active learning", data: SAMPLE_CONVERSATION },
  { label: "Passive delegation", data: SAMPLE_PASSIVE_CONVERSATION },
  { label: "Delegation + learning", data: SAMPLE_DELEGATION_WITH_LEARNING },
  { label: "Verification", data: SAMPLE_VERIFICATION_CONVERSATION },
  { label: "Copy-paste", data: SAMPLE_COPY_PASTE_CONVERSATION },
];

export function InputPage() {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleAnalyze = () => {
    setError("");
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Please paste a conversation before analyzing.");
      return;
    }
    const parsed = parseConversation(trimmed);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const result = analyzeConversation(parsed.messages);
    navigate("/results", { state: { result } });
  };

  const loadSample = (sample: string) => {
    setText(sample);
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <span className="text-white font-bold text-lg tracking-tight">
            AskBetter
          </span>
          <span className="text-slate-500 text-sm ml-1">
            Better questions, better answers
          </span>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
              Analyze your AI conversations
            </h1>
            <p className="text-slate-400 text-lg">
              Paste a ChatGPT conversation and get instant feedback on how
              you're prompting.
            </p>
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              className="w-full h-64 bg-slate-800 border border-slate-700 rounded-2xl p-4 text-slate-200 text-sm placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder={`Paste your ChatGPT conversation here...\n\nExample format:\nYou: Write me a Python script...\nChatGPT: Sure! Here's...\nYou: Why does this work?\nChatGPT: Great question...`}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError("");
              }}
            />
            {text && (
              <button
                onClick={() => setText("")}
                className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 text-xs transition"
              >
                Clear
              </button>
            )}
          </div>

          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

          {/* Analyze button */}
          <div className="mt-4">
            <button
              onClick={handleAnalyze}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition active:scale-95"
            >
              Analyze conversation
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Sample conversations */}
          <div className="mt-5">
            <p className="text-slate-500 text-xs uppercase tracking-wider mb-2 font-medium">
              Try a sample
            </p>
            <div className="flex flex-wrap gap-2">
              {SAMPLES.map((s) => (
                <button
                  key={s.label}
                  onClick={() => loadSample(s.data)}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Format hint */}
          <div className="mt-8 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
              Supported formats
            </p>
            <ul className="text-slate-400 text-sm space-y-1">
              <li>
                <span className="text-slate-300">Labeled:</span> Lines starting
                with{" "}
                <code className="text-indigo-400 bg-slate-700 px-1 rounded text-xs">
                  You:
                </code>
                ,{" "}
                <code className="text-indigo-400 bg-slate-700 px-1 rounded text-xs">
                  User:
                </code>
                , or{" "}
                <code className="text-indigo-400 bg-slate-700 px-1 rounded text-xs">
                  Human:
                </code>
              </li>
              <li>
                <span className="text-slate-300">Alternating blocks:</span>{" "}
                Paragraphs separated by blank lines (user first)
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
