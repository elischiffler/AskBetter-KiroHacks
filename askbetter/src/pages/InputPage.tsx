import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, Loader2 } from 'lucide-react';
import { analyzeConversation } from '../analysis/analyzer';
import { isAIShareUrl, getPromptsFromInput, getLinkErrorMessage } from '../analysis/linkParser';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { saveAnalysis } from '../lib/chatHistory';

// ---------------------------------------------------------------------------
// Animated grid component (CSS-only, no canvas)
// ---------------------------------------------------------------------------
function AnimatedGrid() {
  return (
    <div className="relative z-0 w-full h-full overflow-hidden" aria-hidden="true">
      {/* Perspective grid lines — horizontal */}
      <div className="absolute inset-0 flex flex-col justify-center items-center">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(139,92,246,0.25) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139,92,246,0.25) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            transform: 'perspective(600px) rotateX(40deg) scale(2)',
            transformOrigin: 'center top',
            animation: 'gridScroll 6s linear infinite',
          }}
        />
      </div>
      {/* Radial vignette overlay */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, #0f0a1e 80%)',
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export function InputPage() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const navigateWithSave = async (result: import('../analysis/types').AnalysisResult) => {
    if (user) {
      try {
        await saveAnalysis(user.id, result);
      } catch {
        // Save failed silently
      }
    }
    navigate('/results', { state: { result } });
  };

  // Inject keyframe animation once
  useEffect(() => {
    const id = 'grid-scroll-keyframes';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @keyframes gridScroll {
        from { background-position: 0 0; }
        to   { background-position: 0 60px; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      const prompts = await getPromptsFromInput(input);
      if (prompts.length === 0) {
        setError('No user messages detected in that conversation.');
        return;
      }
      const result = analyzeConversation(prompts);
      await navigateWithSave(result);
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
      {/* ------------------------------------------------------------------ */}
      {/* HERO SECTION                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative flex items-center min-h-screen">
        {/* Left column */}
        <div className="relative z-10 flex flex-col justify-center px-16 md:px-28 w-full md:w-1/2 py-24">
          {/* Eyebrow */}
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-6"
            style={{ color: '#a78bfa' }}
          >
            AI Prompt Analysis
          </p>

          {/* Headline */}
          <h1
            className="text-6xl md:text-7xl font-black uppercase leading-none tracking-tight mb-6"
            style={{ color: '#f5f3ff' }}
          >
            Ask
            <br />
            <span style={{ color: '#7c3aed' }}>Better</span>
          </h1>

          {/* Subtext */}
          <p className="text-lg md:text-xl font-medium mb-10" style={{ color: '#c4b5fd' }}>
            Better Questions, Better Answers
          </p>

          {/* CTAs */}
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={scrollToForm}
              className="inline-flex items-center gap-2 px-8 py-4 text-sm font-bold uppercase tracking-widest transition-all active:scale-95"
              style={{ backgroundColor: '#7c3aed', color: '#f5f3ff' }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6d28d9')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7c3aed')
              }
            >
              Analyze Now
              <span aria-hidden="true">↓</span>
            </button>

            {!user && (
              <>
                <button
                  onClick={() => navigate('/auth')}
                  className="inline-flex items-center gap-2 px-8 py-4 text-sm font-bold uppercase tracking-widest transition-all active:scale-95"
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(139, 92, 246, 0.45)',
                    color: '#a78bfa',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#7c3aed';
                    e.currentTarget.style.color = '#f5f3ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.45)';
                    e.currentTarget.style.color = '#a78bfa';
                  }}
                >
                  Log in
                </button>

                <button
                  onClick={() => navigate('/auth?mode=signup')}
                  className="inline-flex items-center gap-2 px-8 py-4 text-sm font-bold uppercase tracking-widest transition-all active:scale-95"
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(139, 92, 246, 0.45)',
                    color: '#a78bfa',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#7c3aed';
                    e.currentTarget.style.color = '#f5f3ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.45)';
                    e.currentTarget.style.color = '#a78bfa';
                  }}
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right column — animated grid + logo overlay */}
        <div className="hidden md:block absolute right-0 top-0 h-full" style={{ width: '50%' }}>
          <AnimatedGrid />
          {/* Logo centered over the grid, above the vignette */}
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <img src="/logo.png" alt="AskBetter" className="w-[600px] object-contain" />
          </div>
        </div>

        {/* Bottom border line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ backgroundColor: 'rgba(139,92,246,0.2)' }}
        />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* INPUT FORM SECTION                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section
        ref={formRef}
        className="flex justify-center items-start px-4 py-24"
        style={{ backgroundColor: '#0f0a1e' }}
      >
        <div className="w-full max-w-xl">
          {/* Section label */}
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-3 text-center"
            style={{ color: '#a78bfa' }}
          >
            Get Started
          </p>
          <h2
            className="text-3xl font-black uppercase text-center mb-4"
            style={{ color: '#f5f3ff' }}
          >
            Analyze Your Chat
          </h2>

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
      </section>
    </div>
  );
}
