import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  ChevronRight,
  FileText,
  Loader2,
  Link,
  AlertTriangle,
} from "lucide-react";
import { analyzeConversation } from "../analysis/analyzer";
import {
  isChatGPTShareUrl,
  getPromptsFromInput,
  getLinkErrorMessage,
} from "../analysis/linkParser";
import {
  SAMPLE_CONVERSATION,
  SAMPLE_PASSIVE_CONVERSATION,
  SAMPLE_DELEGATION_WITH_LEARNING,
  SAMPLE_VERIFICATION_CONVERSATION,
  SAMPLE_COPY_PASTE_CONVERSATION,
} from "../lib/sampleData";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InputState = "idle" | "loading" | "error";

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InputPage() {
  const [text, setText] = useState("");
  const [inputState, setInputState] = useState<InputState>("idle");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const isUrl = isChatGPTShareUrl(text.trim());
  const isLoading = inputState === "loading";

  const handleAnalyze = async () => {
    setError("");
    const trimmed = text.trim();

    if (!trimmed) {
      setError(
        "Please paste a conversation or a ChatGPT share link before analyzing.",
      );
      return;
    }

    try {
      setInputState("loading");

      const prompts = await getPromptsFromInput(trimmed);

      if (prompts.length === 0) {
        setInputState("error");
        setError("No user messages detected. Try the format hint below.");
        return;
      }

      const result = analyzeConversation(prompts);
      setInputState("idle");
      navigate("/results", { state: { result } });
    } catch (err: unknown) {
      setInputState("error");
      const code = err instanceof Error ? err.message : "UNKNOWN";
      setError(getLinkErrorMessage(code));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      void handleAnalyze();
    }
  };

  const loadSample = (sample: string) => {
    setText(sample);
    setError("");
    setInputState("idle");
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (inputState === "error") {
      setInputState("idle");
      setError("");
    }
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
              Paste a ChatGPT conversation transcript or a shared ChatGPT link.
            </p>
          </div>

          {/* Input area */}
          <div className="relative">
            {/* URL mode indicator */}
            {isUrl && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-indigo-600/20 border border-indigo-500/30 rounded-lg px-2 py-1 z-10">
                <Link className="w-3 h-3 text-indigo-400" />
                <span className="text-indigo-300 text-xs font-medium">
                  Share link detected
                </span>
              </div>
            )}

            <textarea
              className={`w-full h-64 bg-slate-800 border rounded-2xl p-4 text-slate-200 text-sm placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${
                isUrl ? "pt-10" : ""
              } ${
                inputState === "error"
                  ? "border-red-700/60"
                  : "border-slate-700"
              }`}
              placeholder={
                "Paste a ChatGPT conversation transcript or shared link…\n\nTranscript format:\nYou: Write me a Python script...\nChatGPT: Sure! Here's...\nYou: Why does this work?\n\nOr paste a link like:\nhttps://chatgpt.com/share/..."
              }
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />

            {text && !isLoading && (
              <button
                onClick={() => {
                  setText("");
                  setError("");
                  setInputState("idle");
                }}
                className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 text-xs transition"
              >
                Clear
              </button>
            )}
          </div>

          {/* Error message */}
          {inputState === "error" && error && (
            <div className="mt-3 flex items-start gap-2.5 bg-red-950/40 border border-red-800/50 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm leading-relaxed">{error}</p>
            </div>
          )}

          {/* Inline validation error (not link-related) */}
          {inputState === "idle" && error && (
            <p className="text-red-400 text-sm mt-2">{error}</p>
          )}

          {/* Analyze button */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => void handleAnalyze()}
              disabled={isLoading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Reading shared conversation…
                </>
              ) : (
                <>
                  Analyze conversation
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
            <span className="text-slate-600 text-xs hidden sm:block">
              or ⌘↵
            </span>
          </div>

          {/* Sample conversations */}
          <div className="mt-6">
            <p className="text-slate-500 text-xs uppercase tracking-wider mb-2 font-medium">
              Try a sample
            </p>
            <div className="flex flex-wrap gap-2">
              {SAMPLES.map((s) => (
                <button
                  key={s.label}
                  onClick={() => loadSample(s.data)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-40 text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Format hint */}
          <div className="mt-8 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
              Supported inputs
            </p>
            <ul className="text-slate-400 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <Link className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                <span>
                  <span className="text-slate-300">Share link: </span>
                  paste a{" "}
                  <code className="text-indigo-400 bg-slate-700 px-1 rounded text-xs">
                    https://chatgpt.com/share/…
                  </code>{" "}
                  URL directly
                </span>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <span>
                  <span className="text-slate-300">Labeled transcript: </span>
                  lines starting with{" "}
                  <code className="text-indigo-400 bg-slate-700 px-1 rounded text-xs">
                    You:
                  </code>{" "}
                  /{" "}
                  <code className="text-indigo-400 bg-slate-700 px-1 rounded text-xs">
                    User:
                  </code>{" "}
                  /{" "}
                  <code className="text-indigo-400 bg-slate-700 px-1 rounded text-xs">
                    Human:
                  </code>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <span>
                  <span className="text-slate-300">Alternating blocks: </span>
                  paragraphs separated by blank lines (user first)
                </span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
