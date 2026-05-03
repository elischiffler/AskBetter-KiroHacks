import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MessageSquare,
  Clock,
  Target,
  CheckCircle,
  AlertCircle,
  Loader2,
  Send,
  Info,
} from 'lucide-react';
import type { AnalysisResult } from '../analysis/types';
import { Header } from '../components/Header';
import { streamChatReply, type ChatMessage } from '../lib/chatClient';

// ── helpers ──────────────────────────────────────────────────────────────────

function estimateDuration(promptCount: number): string {
  const minutes = Math.max(1, Math.round(promptCount * 0.8));
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

const CATEGORY_COLORS: Record<string, string> = {
  Delegation: '#7c3aed',
  Curiosity: '#a78bfa',
  Collaborative: '#6d28d9',
  Verification: '#c4b5fd',
};

const SCORE_COLORS: Record<string, string> = {
  autonomy: '#7c3aed',
  curiosity: '#a78bfa',
  criticalThinking: '#c4b5fd',
  engagement: '#6d28d9',
};

// ── design tokens ─────────────────────────────────────────────────────────────

const BG = '#0f0a1e';
const CARD_BG = '#1a1030';
const BORDER = 'rgba(139, 92, 246, 0.25)';
const TEXT_PRIMARY = '#f5f3ff';
const TEXT_MUTED = '#a78bfa';
const TEXT_DIM = '#6b5fa0';

// ── sub-components ────────────────────────────────────────────────────────────

interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
  suffix?: string;
  tooltip?: string;
}

function ProgressBar({ label, value, max, color, suffix, tooltip }: ProgressBarProps) {
  const pct = Math.round((value / max) * 100);
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1.5">
        <span
          className="text-sm font-medium flex items-center gap-1.5 relative"
          style={{ color: TEXT_MUTED }}
        >
          {label}
          {tooltip && (
            <span
              className="inline-flex cursor-help"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onTouchStart={() => setShowTooltip((v) => !v)}
            >
              <Info className="w-3.5 h-3.5" style={{ color: TEXT_DIM }} />
              {showTooltip && (
                <span
                  className="absolute left-0 top-full mt-1.5 z-50 w-56 px-3 py-2 rounded-lg text-xs leading-relaxed shadow-lg"
                  style={{
                    backgroundColor: '#1e1545',
                    border: `1px solid ${BORDER}`,
                    color: TEXT_MUTED,
                  }}
                >
                  {tooltip}
                </span>
              )}
            </span>
          )}
        </span>
        <span className="text-sm font-bold" style={{ color }}>
          {suffix ? `${value}${suffix}` : `${value}%`}
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: 'rgba(139,92,246,0.12)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

interface FeedbackCardProps {
  type: 'positive' | 'suggestion' | 'warning';
  title: string;
  description: string;
}

function FeedbackCard({ type, title, description }: FeedbackCardProps) {
  const config = {
    positive: {
      bg: 'rgba(34, 197, 94, 0.08)',
      border: 'rgba(34, 197, 94, 0.3)',
      borderLeft: '#22c55e',
      icon: CheckCircle,
      iconColor: '#4ade80',
      titleColor: '#86efac',
      textColor: '#bbf7d0',
    },
    suggestion: {
      bg: 'rgba(251, 146, 60, 0.08)',
      border: 'rgba(251, 146, 60, 0.25)',
      borderLeft: '#fb923c',
      icon: AlertCircle,
      iconColor: '#fb923c',
      titleColor: '#fdba74',
      textColor: '#fed7aa',
    },
    warning: {
      bg: 'rgba(239, 68, 68, 0.08)',
      border: 'rgba(239, 68, 68, 0.25)',
      borderLeft: '#ef4444',
      icon: AlertCircle,
      iconColor: '#f87171',
      titleColor: '#fca5a5',
      textColor: '#fecaca',
    },
  }[type];

  const Icon = config.icon;

  return (
    <div
      className="rounded-xl p-4 mb-3"
      style={{
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        borderLeft: `3px solid ${config.borderLeft}`,
      }}
    >
      <div className="flex items-start gap-3">
        <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: config.iconColor }} />
        <div>
          <p className="font-semibold text-sm mb-1" style={{ color: config.titleColor }}>
            {title}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: config.textColor }}>
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── section wrapper ───────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-8 mb-4 ${className}`}
      style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs font-semibold tracking-widest uppercase mb-2"
      style={{ color: TEXT_MUTED }}
    >
      {children}
    </p>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-black uppercase mb-5" style={{ color: TEXT_PRIMARY }}>
      {children}
    </h2>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result as AnalysisResult | undefined;

  // Analysis is saved to chat_histories from InputPage/AnalyzePage before navigating here.
  // No separate save needed — the dashboard reads from the same table.

  if (!result) {
    navigate('/');
    return null;
  }

  const totalMessages = result.prompts.length;
  const duration = estimateDuration(totalMessages);

  const categoryTotal = result.distribution.reduce((s, d) => s + d.value, 0);

  const categoryTooltips: Record<string, string> = {
    Delegation:
      'Prompts where you asked AI to do a task — write, fix, build, summarize. Not inherently bad, but bare delegation without context scores low.',
    Curiosity:
      "Prompts where you asked why, how, or what-if. These show you're trying to understand, not just get an output.",
    Collaborative:
      'Prompts where you thought with AI — brainstorming, comparing options, asking for opinions. Shows partnership over outsourcing.',
    Verification:
      'Prompts where you asked AI to check, review, or validate your work. Quality depends on whether you asked what could go wrong.',
  };

  const categories = result.distribution.map((d) => ({
    name: d.name,
    pct: categoryTotal > 0 ? Math.round((d.value / categoryTotal) * 100) : 0,
    color: CATEGORY_COLORS[d.name] ?? d.color,
    tooltip: categoryTooltips[d.name] ?? '',
  }));

  const scoreItems = [
    {
      key: 'autonomy',
      label: 'Autonomy',
      value: result.scores.autonomy,
      tooltip:
        'Did you show your own thinking before asking? Higher means you shared attempts, reasoning, or context instead of just offloading tasks.',
    },
    {
      key: 'curiosity',
      label: 'Curiosity',
      value: result.scores.curiosity,
      tooltip:
        'Did you ask why, how, or what-if? Higher means you explored ideas and asked the AI to explain, not just produce.',
    },
    {
      key: 'criticalThinking',
      label: 'Critical Thinking',
      value: result.scores.criticalThinking,
      tooltip:
        'Did you challenge answers? Higher means you asked for edge cases, risks, alternatives, or reasoning — not just accepted outputs.',
    },
    {
      key: 'engagement',
      label: 'Engagement',
      value: result.scores.engagement,
      tooltip:
        'Did you iterate and follow up? Higher means you built on responses, asked follow-ups, and sustained a real conversation.',
    },
  ];

  // Feedback cards — balanced mix of what went well and what to improve.
  // Show up to 2 positive patterns, up to 2 warning patterns, and fill
  // remaining slots (up to 5 total) with suggestions.
  const positivePatterns = result.patterns.filter((p) => p.severity === 'positive').slice(0, 2);
  const warningPatterns = result.patterns.filter((p) => p.severity === 'warning').slice(0, 2);

  // Calculate how many suggestion slots remain (target 5 total cards max)
  const patternCount = positivePatterns.length + warningPatterns.length;
  const suggestionSlots = Math.max(1, 5 - patternCount);
  const improvementSuggestions = result.suggestions.slice(0, suggestionSlots);

  // Order: positives first (green), then warnings (red), then suggestions (orange)
  const feedbackItems: FeedbackCardProps[] = [
    ...positivePatterns.map((p) => ({
      type: 'positive' as const,
      title: p.label,
      description: p.description,
    })),
    ...warningPatterns.map((p) => ({
      type: 'warning' as const,
      title: p.label,
      description: p.description,
    })),
    ...improvementSuggestions.map((s) => ({
      type: 'suggestion' as const,
      title: 'Suggestion',
      description: s,
    })),
  ];

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [input, setInput] = useState('');
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [isStreaming, setIsStreaming] = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [chatError, setChatError] = useState('');
  const [showActionButtons, setShowActionButtons] = useState(true);

  // Generate initial AI message on mount
  useState(() => {
    const generateInitialMessage = () => {
      // Use the summary from the analysis result
      const initialMessage = result.summary || 'Analysis complete. How can I help you improve your prompts?';
      
      setMessages([{ role: 'assistant' as const, content: initialMessage }]);
    };

    generateInitialMessage();
  });

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || isStreaming) return;

    setChatError('');
    setInput('');
    setShowActionButtons(false);

    const contextMessage: ChatMessage = {
      role: 'user' as const,
      content: `[CONTEXT] Here are the original prompts I analyzed:

${result.prompts
  .map(
    (
      p,
      i
    ) => `Prompt ${i + 1} (Score: ${p.qualityScore}/100, Intent: ${p.primaryIntent}, Role: ${p.cognitiveRole}, Effort: ${p.effortTier}):
"${p.text}"
Flags: ${p.flags.length > 0 ? p.flags.join(', ') : 'none'}
Missing: ${p.missingSignals.length > 0 ? p.missingSignals.join(', ') : 'none'}
`
  )
  .join('\n')}

Analysis Summary:
- Overall Quality: ${result.scores.overallQuality}/100
- Autonomy: ${result.scores.autonomy}/100
- Curiosity: ${result.scores.curiosity}/100
- Critical Thinking: ${result.scores.criticalThinking}/100
- Specificity: ${result.scores.specificity}/100
- Context: ${result.scores.context}/100
- Engagement: ${result.scores.engagement}/100

Patterns Detected: ${result.patterns.map((p) => p.label).join(', ')}

Now, here's my question:`,
    };

    const userMessage: ChatMessage = { role: 'user' as const, content };

    const isFirstUserMessage = messages.filter((m) => m.role === 'user').length === 0;
    const messagesToSend = isFirstUserMessage
      ? [contextMessage, ...messages, userMessage]
      : [...messages, userMessage];

    setMessages([...messages, userMessage, { role: 'assistant' as const, content: '' }]);
    setIsStreaming(true);

    let assistantText = '';
    let streamError = '';

    try {
      await streamChatReply(messagesToSend, {
        onToken: (token) => {
          assistantText += token;
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (!last || last.role !== 'assistant') return prev;
            updated[updated.length - 1] = { ...last, content: assistantText };
            return updated;
          });
        },
        onError: (message) => {
          streamError = message;
        },
      });

      if (streamError) throw new Error(streamError);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stream response.';
      setChatError(message);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'assistant' && !last.content) updated.pop();
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleDraftBetter = async () => {
    setShowActionButtons(false);

    const sortedPrompts = [...result.prompts].sort((a, b) => a.qualityScore - b.qualityScore);
    const worstPrompts = sortedPrompts.slice(0, 3);

    const draftMessage = `Great! Let's improve your prompts together. I'll guide you through rewriting your weakest prompts to be more effective.

**Your 3 weakest prompts:**
${worstPrompts.map((p, i) => `${i + 1}. "${p.text.substring(0, 80)}${p.text.length > 80 ? '...' : ''}" (Score: ${p.qualityScore}/100)`).join('\n')}

Let's start with the first one. What were you trying to accomplish with this prompt? What context or background information should the AI know?`;

    const contextMessage: ChatMessage = {
      role: 'user' as const,
      content: `[CONTEXT] Here are the original prompts I analyzed:

${result.prompts
  .map(
    (
      p,
      i
    ) => `Prompt ${i + 1} (Score: ${p.qualityScore}/100, Intent: ${p.primaryIntent}, Role: ${p.cognitiveRole}, Effort: ${p.effortTier}):
"${p.text}"
Flags: ${p.flags.length > 0 ? p.flags.join(', ') : 'none'}
Missing: ${p.missingSignals.length > 0 ? p.missingSignals.join(', ') : 'none'}
`
  )
  .join('\n')}

Analysis Summary:
- Overall Quality: ${result.scores.overallQuality}/100
- Autonomy: ${result.scores.autonomy}/100
- Curiosity: ${result.scores.curiosity}/100
- Critical Thinking: ${result.scores.criticalThinking}/100

Patterns Detected: ${result.patterns.map((p) => p.label).join(', ')}

Now, I want to improve my prompts.`,
    };

    const userMessage: ChatMessage = { role: 'user' as const, content: 'Draft Better' };
    const messagesToSend = [contextMessage, ...messages, userMessage];

    setMessages([...messages, userMessage, { role: 'assistant' as const, content: '' }]);
    setIsStreaming(true);

    let assistantText = '';
    try {
      await streamChatReply(messagesToSend, {
        onToken: (token) => {
          assistantText += token;
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (!last || last.role !== 'assistant') return prev;
            updated[updated.length - 1] = { ...last, content: assistantText || draftMessage };
            return updated;
          });
        },
        onError: () => {},
      });
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant' as const, content: draftMessage };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleAskOwn = () => {
    setShowActionButtons(false);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG, color: TEXT_PRIMARY }}>
      <Header />

      <div className="max-w-7xl mx-auto px-4 pt-28 pb-16">
        {/* Back nav */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 mb-8 text-xs font-bold uppercase tracking-widest transition-all"
          style={{ color: TEXT_MUTED }}
          onMouseEnter={(e) => (e.currentTarget.style.color = TEXT_PRIMARY)}
          onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_MUTED)}
        >
          <ArrowLeft className="w-4 h-4" />
          Analyze Another Chat
        </button>

        {/* ── Top Row: Chat Analysis + Live Chat ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          {/* Chat Analysis (left, smaller) */}
          <div className="lg:col-span-4">
            <Card className="!p-6">
          {/* Header row */}
          <div className="mb-6">
            <SectionLabel>Results</SectionLabel>
            <h1 className="text-xl font-black uppercase mb-4" style={{ color: TEXT_PRIMARY }}>
              Chat Analysis
            </h1>
            {/* Overall score badge */}
            <div
              className="flex flex-col items-center justify-center rounded-xl px-4 py-3"
              style={{ backgroundColor: 'rgba(124,58,237,0.15)', border: `1px solid ${BORDER}` }}
            >
              <span
                className="text-xs font-semibold uppercase tracking-widest mb-1"
                style={{ color: TEXT_MUTED }}
              >
                Overall
              </span>
              <span className="text-3xl font-black" style={{ color: '#a78bfa' }}>
                {result.scores.overallQuality}
              </span>
              <span className="text-xs" style={{ color: TEXT_DIM }}>
                /100
              </span>
            </div>
          </div>

          {/* Stat chips */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div
              className="rounded-xl p-3"
              style={{ backgroundColor: 'rgba(124,58,237,0.1)', border: `1px solid ${BORDER}` }}
            >
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-3 h-3" style={{ color: TEXT_MUTED }} />
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: TEXT_DIM }}
                >
                  Messages
                </span>
              </div>
              <p className="text-2xl font-black" style={{ color: TEXT_PRIMARY }}>
                {totalMessages}
              </p>
            </div>
            <div
              className="rounded-xl p-3"
              style={{ backgroundColor: 'rgba(124,58,237,0.1)', border: `1px solid ${BORDER}` }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3 h-3" style={{ color: TEXT_MUTED }} />
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: TEXT_DIM }}
                >
                  Duration
                </span>
              </div>
              <p className="text-lg font-black" style={{ color: TEXT_PRIMARY }}>
                {duration}
              </p>
            </div>
          </div>

          {/* Category breakdown */}
          <SectionLabel>Category Breakdown</SectionLabel>
          <div className="h-px mb-4" style={{ backgroundColor: BORDER }} />
          {categories.map((c) => (
            <ProgressBar
              key={c.name}
              label={c.name}
              value={c.pct}
              max={100}
              color={c.color}
              tooltip={c.tooltip}
            />
          ))}

          <div className="h-px my-4" style={{ backgroundColor: BORDER }} />

          {/* Score breakdown */}
          <SectionLabel>Score Breakdown</SectionLabel>
          <div className="h-px mb-4" style={{ backgroundColor: BORDER }} />
          {scoreItems.map((s) => (
            <ProgressBar
              key={s.key}
              label={s.label}
              value={s.value}
              max={100}
              color={SCORE_COLORS[s.key] ?? '#7c3aed'}
              suffix="/100"
              tooltip={s.tooltip}
            />
          ))}
            </Card>
          </div>

          {/* Live Chat (right, wider) */}
          <div className="lg:col-span-8">
            <Card className="!p-6">
          <SectionLabel>AI Assistant</SectionLabel>
          <SectionTitle>Live Chat</SectionTitle>

          {/* Message list */}
          <div
            className="h-[44vh] overflow-y-auto pr-1 mb-4 rounded-xl p-3"
            style={{ backgroundColor: 'rgba(15,10,30,0.6)', border: `1px solid ${BORDER}` }}
          >
            {messages.length === 0 ? (
              <div
                className="h-full flex items-center justify-center text-sm"
                style={{ color: TEXT_DIM }}
              >
                Send a message to start chatting.
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((m, index) => {
                  const isUser = m.role === 'user';
                  return (
                    <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className="max-w-[85%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap"
                        style={
                          isUser
                            ? { backgroundColor: '#7c3aed', color: TEXT_PRIMARY }
                            : {
                                backgroundColor: 'rgba(139,92,246,0.1)',
                                border: `1px solid ${BORDER}`,
                                color: TEXT_MUTED,
                              }
                        }
                      >
                        {m.content || (isStreaming && !isUser ? '…' : '')}
                      </div>
                    </div>
                  );
                })}

                {/* Action buttons after initial message */}
                {showActionButtons && messages.length === 1 && (
                  <div className="flex gap-3 justify-center mt-4">
                    <button
                      onClick={handleDraftBetter}
                      disabled={isStreaming}
                      className="px-6 py-3 rounded-xl text-white text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: '#7c3aed' }}
                    >
                      ✍️ Draft Better?
                    </button>
                    <button
                      onClick={handleAskOwn}
                      disabled={isStreaming}
                      className="px-6 py-3 rounded-xl text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
                      style={{
                        border: `1px solid ${BORDER}`,
                        color: TEXT_MUTED,
                        backgroundColor: 'transparent',
                      }}
                    >
                      💬 Ask Own Questions
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {chatError && (
            <p className="text-xs mb-3" style={{ color: '#f87171' }}>
              {chatError}
            </p>
          )}

          {/* Input row */}
          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              value={input}
              disabled={isStreaming}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Type your message…"
              className="flex-1 px-4 py-2.5 rounded-xl text-sm resize-none focus:outline-none transition"
              style={{
                backgroundColor: BG,
                border: `1px solid ${BORDER}`,
                color: TEXT_PRIMARY,
              }}
              onFocus={(e) => (e.currentTarget.style.border = '1px solid rgba(139,92,246,0.8)')}
              onBlur={(e) => (e.currentTarget.style.border = `1px solid ${BORDER}`)}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={isStreaming || !input.trim()}
              className="h-[52px] px-5 rounded-xl text-sm font-bold uppercase tracking-widest flex items-center gap-2 transition-all"
              style={{
                backgroundColor: isStreaming || !input.trim() ? 'rgba(124,58,237,0.2)' : '#7c3aed',
                color: isStreaming || !input.trim() ? TEXT_DIM : TEXT_PRIMARY,
                cursor: isStreaming || !input.trim() ? 'not-allowed' : 'pointer',
                border: `1px solid ${BORDER}`,
              }}
              onMouseEnter={(e) => {
                if (!isStreaming && input.trim()) e.currentTarget.style.backgroundColor = '#6d28d9';
              }}
              onMouseLeave={(e) => {
                if (!isStreaming && input.trim()) e.currentTarget.style.backgroundColor = '#7c3aed';
              }}
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send
            </button>
          </div>
            </Card>
          </div>
        </div>

        {/* ── Bottom Row: Feedback & Recommendations (full width) ── */}
        {feedbackItems.length > 0 && (
          <Card>
            <div className="flex items-center gap-3 mb-5">
              <Target className="w-4 h-4" style={{ color: TEXT_MUTED }} />
              <SectionTitle>Feedback &amp; Recommendations</SectionTitle>
            </div>
            {feedbackItems.map((item, i) => (
              <FeedbackCard key={i} {...item} />
            ))}
          </Card>
        )}

        
      </div>
    </div>
  );
}
