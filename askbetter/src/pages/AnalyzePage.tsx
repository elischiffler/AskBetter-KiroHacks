import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, Loader2 } from 'lucide-react';
import { analyzeConversation } from '../analysis/analyzer';
import { isAIShareUrl, getPromptsFromInput, getLinkErrorMessage, detectPlatform } from '../analysis/linkParser';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { saveAnalysis } from '../lib/chatHistory';

export function AnalyzePage() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const navigateWithSave = async (result: import('../analysis/types').AnalysisResult, detectedPlatform?: string | null) => {
    if (user) {
      try {
        await saveAnalysis(user.id, result);
      } catch {
        // Save failed silently — don't block the user from seeing results
      }
    }
    navigate('/results', { state: { result, detectedPlatform } });
  };

  const handleAnalyze = async () => {
    setError('');
    const input = url.trim();

    if (!input) {
      setError('Please enter an AI chat share link.');
      return;
    }

    if (!isAIShareUrl(input)) {
      setError(
        "That doesn't look like a valid AI chat share link. We support ChatGPT, Claude, Gemini, Grok, and Perplexity."
      );
      return;
    }

    try {
      setIsLoading(true);
      const { prompts } = await getPromptsFromInput(input);
      if (prompts.length === 0) {
        setError('No user messages detected in that conversation.');
        return;
      }
      const result = analyzeConversation(prompts);
      const platform = detectPlatform(input);
      await navigateWithSave(result, platform);
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : 'UNKNOWN';
      setError(getLinkErrorMessage(code));
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = isLoading || !url.trim();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f0a1e', color: '#f5f3ff' }}>
      <Header />

      <div className="flex justify-center items-center px-4 pt-32 pb-24 min-h-screen">
        <div className="w-full max-w-xl">
          {/* Section label */}
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-3 text-center"
            style={{ color: '#a78bfa' }}
          >
            Get Started
          </p>
          <h1
            className="text-3xl font-black uppercase text-center mb-4"
            style={{ color: '#f5f3ff' }}
          >
            Analyze Your Chat
          </h1>

          {/* Disclaimer */}
          {!user && (
            <p className="text-center text-xs mb-8" style={{ color: '#6b5fa0' }}>
              <button
                onClick={() => navigate('/auth')}
                className="underline underline-offset-2 transition-colors"
                style={{ color: '#a78bfa' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#f5f3ff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#a78bfa')}
              >
                Sign in or sign up
              </button>{' '}
              to track your metrics over time and see your progress.
            </p>
          )}

          {/* Card */}
          <div
            className="rounded-2xl p-8"
            style={{
              backgroundColor: '#1a1030',
              border: '1px solid rgba(139,92,246,0.25)',
            }}
          >
            {/* Input */}
            <div className="mb-4">
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: '#a78bfa' }}
              >
                AI Chat Share Link
              </label>
              <p className="text-xs mb-3" style={{ color: '#6b5fa0' }}>
                Supports: ChatGPT • Claude • Gemini • Grok • Perplexity
              </p>
              <div className="relative">
                <Link2
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: '#7c3aed' }}
                />
                <input
                  type="url"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm placeholder-opacity-40 focus:outline-none transition"
                  style={{
                    backgroundColor: '#0f0a1e',
                    border: '1px solid rgba(139,92,246,0.3)',
                    color: '#f5f3ff',
                  }}
                  placeholder="https://chatgpt.com/share/... or other AI chat link"
                  value={url}
                  disabled={isLoading}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setUrl(e.target.value);
                    setError('');
                  }}
                  onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && void handleAnalyze()}
                  onFocus={(e) => (e.currentTarget.style.border = '1px solid rgba(139,92,246,0.8)')}
                  onBlur={(e) => (e.currentTarget.style.border = '1px solid rgba(139,92,246,0.3)')}
                />
              </div>
            </div>

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
            Paste a share link from any supported AI platform
          </p>
        </div>
      </div>
    </div>
  );
}
