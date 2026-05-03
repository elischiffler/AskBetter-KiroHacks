import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, Loader2 } from 'lucide-react';
import { analyzeConversation } from '../analysis/analyzer';
import { parseConversation } from '../analysis/parser';
import {
  isChatGPTShareUrl,
  getPromptsFromInput,
  getLinkErrorMessage,
} from '../analysis/linkParser';
import { Header } from '../components/Header';

export function AnalyzePage() {
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

    if (mode === 'paste') {
      const prompts = parseConversation(input);
      if (prompts.length === 0) {
        setError('No user messages detected. Try pasting the conversation text directly.');
        return;
      }
      const result = analyzeConversation(prompts);
      navigate('/results', { state: { result } });
      return;
    }

    if (!isChatGPTShareUrl(input)) {
      setError(
        "That doesn't look like a ChatGPT share link. It should start with https://chatgpt.com/share/"
      );
      return;
    }

    try {
      setIsLoading(true);
      const prompts = await getPromptsFromInput(input);
      if (prompts.length === 0) {
        setError('No user messages detected in that conversation.');
        return;
      }
      const result = analyzeConversation(prompts);
      navigate('/results', { state: { result } });
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : 'UNKNOWN';
      setError(getLinkErrorMessage(code));
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = isLoading || (mode === 'link' ? !url.trim() : !text.trim());

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f0a1e', color: '#f5f3ff' }}>
      <Header />

      <div className="flex justify-center items-start px-4 pt-32 pb-24">
        <div className="w-full max-w-xl">
          {/* Section label */}
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-3 text-center"
            style={{ color: '#a78bfa' }}
          >
            Analyze
          </p>
          <h1
            className="text-3xl font-black uppercase text-center mb-10"
            style={{ color: '#f5f3ff' }}
          >
            Analyze Your Chat
          </h1>

          {/* Card */}
          <div
            className="rounded-2xl p-8"
            style={{
              backgroundColor: '#1a1030',
              border: '1px solid rgba(139,92,246,0.25)',
            }}
          >
            {/* Mode toggle */}
            <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ backgroundColor: '#0f0a1e' }}>
              {(['link', 'paste'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setError('');
                  }}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold transition"
                  style={
                    mode === m
                      ? { backgroundColor: '#7c3aed', color: '#f5f3ff' }
                      : { color: '#a78bfa' }
                  }
                >
                  {m === 'link' ? 'Share Link' : 'Paste Text'}
                </button>
              ))}
            </div>

            {/* Input */}
            {mode === 'link' ? (
              <div className="mb-4">
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: '#a78bfa' }}
                >
                  ChatGPT Share Link
                </label>
                <div className="relative">
                  <Link2
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: '#7c3aed' }}
                  />
                  <input
                    type="url"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none transition"
                    style={{
                      backgroundColor: '#0f0a1e',
                      border: '1px solid rgba(139,92,246,0.3)',
                      color: '#f5f3ff',
                    }}
                    placeholder="https://chatgpt.com/share/..."
                    value={url}
                    disabled={isLoading}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setUrl(e.target.value);
                      setError('');
                    }}
                    onKeyDown={(e: React.KeyboardEvent) =>
                      e.key === 'Enter' && void handleAnalyze()
                    }
                    onFocus={(e) =>
                      (e.currentTarget.style.border = '1px solid rgba(139,92,246,0.8)')
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.border = '1px solid rgba(139,92,246,0.3)')
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: '#a78bfa' }}
                >
                  Conversation Text
                </label>
                <textarea
                  className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none transition"
                  style={{
                    backgroundColor: '#0f0a1e',
                    border: '1px solid rgba(139,92,246,0.3)',
                    color: '#f5f3ff',
                  }}
                  placeholder={`Paste your ChatGPT conversation here...\n\nYou: Write me a Python script...\nChatGPT: Sure! Here's...\nYou: Why does this work?`}
                  rows={7}
                  value={text}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                    setText(e.target.value);
                    setError('');
                  }}
                  onFocus={(e) => (e.currentTarget.style.border = '1px solid rgba(139,92,246,0.8)')}
                  onBlur={(e) => (e.currentTarget.style.border = '1px solid rgba(139,92,246,0.3)')}
                />
              </div>
            )}

            {error && (
              <p className="text-xs mb-3" style={{ color: '#f87171' }}>
                {error}
              </p>
            )}

            {/* Analyze button */}
            <button
              onClick={() => void handleAnalyze()}
              disabled={isDisabled}
              className="w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              style={{
                backgroundColor: isDisabled ? '#3b2f5e' : '#7c3aed',
                color: isDisabled ? '#6b5fa0' : '#f5f3ff',
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
          </div>

          {/* Footer note */}
          <p className="text-center text-xs mt-6" style={{ color: '#6b5fa0' }}>
            Analysis runs entirely in your browser.
          </p>
        </div>
      </div>
    </div>
  );
}
