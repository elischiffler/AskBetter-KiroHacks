import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, FileText, Loader2 } from 'lucide-react';
import { analyzeConversation } from '../analysis/analyzer';
import { parseConversation } from '../analysis/parser';
import {
  SAMPLE_CONVERSATION,
  SAMPLE_PASSIVE_CONVERSATION,
  SAMPLE_DELEGATION_WITH_LEARNING,
  SAMPLE_VERIFICATION_CONVERSATION,
  SAMPLE_COPY_PASTE_CONVERSATION,
} from '../lib/sampleData';

export function InputPage() {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'link' | 'paste'>('link');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleAnalyze = async () => {
    setError('');
    const input = mode === 'link' ? url.trim() : text.trim();
    if (!input) {
      setError(
        mode === 'link'
          ? 'Please enter a ChatGPT share link or switch to paste mode.'
          : 'Please paste a conversation before analyzing.'
      );
      return;
    }

    // Paste mode — skip fetch, go straight to parser
    if (mode === 'paste') {
      const parsed = parseConversation(input);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      const result = analyzeConversation(parsed.messages);
      navigate('/results', { state: { result } });
      return;
    }

    // Link mode — not yet supported without linkParser
    setError('Share link analysis is not yet available. Please use Paste Text mode.');
  };

  const loadSample = (sample: string) => {
    setText(sample);
    setUrl('');
    setMode('paste');
    setError('');
  };

  const isDisabled = isLoading || (mode === 'link' ? !url.trim() : !text.trim());

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(135deg, #e8eaf6 0%, #ede9f7 50%, #e3e8f5 100%)' }}
    >
      <div className="w-full max-w-xl">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/60 p-10">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#e8eaf6' }}
            >
              <Link2 className="w-7 h-7" style={{ color: '#4338ca' }} />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-center mb-2" style={{ color: '#3730a3' }}>
            ChatGPT Chat Analyzer
          </h1>
          <p className="text-center text-gray-500 text-sm mb-8">
            Paste your ChatGPT share link below to get detailed insights and feedback
          </p>

          {/* Mode toggle */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => {
                setMode('link');
                setError('');
              }}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                mode === 'link'
                  ? 'text-white shadow-sm'
                  : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
              }`}
              style={mode === 'link' ? { backgroundColor: '#4338ca' } : {}}
            >
              Share Link
            </button>
            <button
              onClick={() => {
                setMode('paste');
                setError('');
              }}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                mode === 'paste'
                  ? 'text-white shadow-sm'
                  : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
              }`}
              style={mode === 'paste' ? { backgroundColor: '#4338ca' } : {}}
            >
              Paste Text
            </button>
          </div>

          {/* Input */}
          {mode === 'link' ? (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ChatGPT Share Link
              </label>
              <input
                type="url"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition"
                style={{ '--tw-ring-color': '#4338ca' } as React.CSSProperties}
                placeholder="https://chatgpt.com/share/..."
                value={url}
                disabled={isLoading}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setUrl(e.target.value);
                  setError('');
                }}
                onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && void handleAnalyze()}
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Conversation Text
              </label>
              <textarea
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:border-transparent transition"
                style={{ '--tw-ring-color': '#4338ca' } as React.CSSProperties}
                placeholder={`Paste your ChatGPT conversation here...\n\nYou: Write me a Python script...\nChatGPT: Sure! Here's...\nYou: Why does this work?`}
                rows={6}
                value={text}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                  setText(e.target.value);
                  setError('');
                }}
              />
            </div>
          )}

          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

          {/* Analyze button */}
          <button
            onClick={() => void handleAnalyze()}
            disabled={isDisabled}
            className="w-full mt-4 py-3.5 rounded-xl text-white font-semibold text-sm transition active:scale-[0.98] flex items-center justify-center gap-2"
            style={{
              backgroundColor: isDisabled ? '#c7c9d9' : '#4338ca',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Reading conversation…
              </>
            ) : (
              'Analyze Chat'
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">or try a sample</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Sample buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => loadSample(SAMPLE_CONVERSATION)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 py-2 px-3 rounded-lg border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 transition"
            >
              <FileText className="w-3.5 h-3.5" />
              Active learning
            </button>
            <button
              onClick={() => loadSample(SAMPLE_PASSIVE_CONVERSATION)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 py-2 px-3 rounded-lg border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 transition"
            >
              <FileText className="w-3.5 h-3.5" />
              Passive
            </button>
            <button
              onClick={() => loadSample(SAMPLE_DELEGATION_WITH_LEARNING)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 py-2 px-3 rounded-lg border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 transition"
            >
              <FileText className="w-3.5 h-3.5" />
              Delegation + learning
            </button>
            <button
              onClick={() => loadSample(SAMPLE_VERIFICATION_CONVERSATION)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 py-2 px-3 rounded-lg border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 transition"
            >
              <FileText className="w-3.5 h-3.5" />
              Verification
            </button>
            <button
              onClick={() => loadSample(SAMPLE_COPY_PASTE_CONVERSATION)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 py-2 px-3 rounded-lg border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 transition"
            >
              <FileText className="w-3.5 h-3.5" />
              Copy-paste
            </button>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
            This tool analyzes your ChatGPT conversations to provide insights on conversation
            quality, tone, and effectiveness
          </p>
        </div>
      </div>
    </div>
  );
}
