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
} from 'lucide-react';
import type { AnalysisResult } from '../analysis/types';
import { streamChatReply, type ChatMessage } from '../lib/chatClient';

// ── helpers ──────────────────────────────────────────────────────────────────

function estimateDuration(promptCount: number): string {
  const minutes = Math.max(1, Math.round(promptCount * 0.8));
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

// Color per category bar
const CATEGORY_COLORS: Record<string, string> = {
  Delegation: '#4338ca',
  Curiosity: '#9333ea',
  Collaborative: '#3b82f6',
  Verification: '#22c55e',
};

// Color per score bar
const SCORE_COLORS: Record<string, string> = {
  autonomy: '#4338ca',
  curiosity: '#9333ea',
  criticalThinking: '#f97316',
  engagement: '#3b82f6',
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
  type: 'positive' | 'warning';
  title: string;
  description: string;
}

function FeedbackCard({ type, title, description }: FeedbackCardProps) {
  const isPositive = type === 'positive';
  return (
    <div
      className="rounded-2xl p-5 mb-3 border-l-4"
      style={{
        backgroundColor: isPositive ? '#f0fdf4' : '#fffbeb',
        borderLeftColor: isPositive ? '#22c55e' : '#f97316',
      }}
    >
      <div className="flex items-start gap-3">
        {isPositive ? (
          <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: '#16a34a' }} />
        ) : (
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: '#ea580c' }} />
        )}
        <div>
          <p
            className="font-semibold text-sm mb-1"
            style={{ color: isPositive ? '#15803d' : '#c2410c' }}
          >
            {title}
          </p>
          <p
            className="text-sm leading-relaxed"
            style={{ color: isPositive ? '#166534' : '#9a3412' }}
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
    navigate('/');
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
    { key: 'autonomy', label: 'Autonomy', value: result.scores.autonomy },
    { key: 'curiosity', label: 'Curiosity', value: result.scores.curiosity },
    { key: 'criticalThinking', label: 'Critical Thinking', value: result.scores.criticalThinking },
    { key: 'engagement', label: 'Engagement', value: result.scores.engagement },
  ];

  // Feedback cards: patterns → positive/warning
  const positivePatterns = result.patterns.filter((p) => p.severity === 'positive');
  const warningPatterns = result.patterns.filter((p) => p.severity === 'warning');

  // Merge suggestions as warning cards if no warning patterns
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
    // Fall back to suggestions if no patterns
    ...(positivePatterns.length === 0 && warningPatterns.length === 0
      ? result.suggestions.map((s, i) => ({
          type: (i % 2 === 0 ? 'positive' : 'warning') as 'positive' | 'warning',
          title: i === 0 ? 'Suggestion' : 'Improvement',
          description: s,
        }))
      : []),
  ];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatError, setChatError] = useState('');
  const [showActionButtons, setShowActionButtons] = useState(true);

  // Generate initial AI message on mount
  useState(() => {
    const generateInitialMessage = () => {
      // Build summary based on analysis
      const overallScore = result.scores.overallQuality;
      
      const primaryCategory = result.distribution.reduce((max, d) => 
        d.value > max.value ? d : max
      );

      // Build bullet points from top issues
      const issues: string[] = [];
      if (result.scores.autonomy < 50) {
        issues.push('Heavy reliance on AI without showing your own thinking');
      }
      if (result.scores.curiosity < 50) {
        issues.push('Missing exploratory questions and "why/how" inquiries');
      }
      if (result.scores.criticalThinking < 50) {
        issues.push('Not asking for reasoning, alternatives, or edge cases');
      }
      if (result.scores.specificity < 50) {
        issues.push('Vague requests without clear goals or constraints');
      }
      if (result.scores.context < 50) {
        issues.push('Insufficient background information provided');
      }

      // Take top 3 issues
      const topIssues = issues.slice(0, 3);

      const initialMessage = `📊 **Analysis Summary:** Your prompts show ${primaryCategory.name.toLowerCase()} patterns (${Math.round((primaryCategory.value / categoryTotal) * 100)}%) with an overall quality score of ${overallScore}/100.

**Key Issues:**
${topIssues.map(issue => `• ${issue}`).join('\n')}

I can help you rewrite these prompts to be more effective and get better AI responses. Would you like me to guide you?`;

      setMessages([{ role: 'assistant' as const, content: initialMessage }]);
    };

    generateInitialMessage();
  });

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || isStreaming) return;

    setChatError('');
    setInput('');
    setShowActionButtons(false); // Hide action buttons once user starts chatting

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages([...nextMessages, { role: 'assistant', content: '' }]);
    setIsStreaming(true);

    let assistantText = '';
    let streamError = '';

    try {
      await streamChatReply(nextMessages, {
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

      if (streamError) {
        throw new Error(streamError);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stream response.';
      setChatError(message);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'assistant' && !last.content) {
          updated.pop();
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleDraftBetter = async () => {
    setShowActionButtons(false);
    
    // Find worst prompts
    const sortedPrompts = [...result.prompts].sort((a, b) => a.qualityScore - b.qualityScore);
    const worstPrompts = sortedPrompts.slice(0, 3);
    
    const draftMessage = `Great! Let's improve your prompts together. I'll guide you through rewriting your weakest prompts to be more effective.

**Your 3 weakest prompts:**
${worstPrompts.map((p, i) => `${i + 1}. "${p.text.substring(0, 80)}${p.text.length > 80 ? '...' : ''}" (Score: ${p.qualityScore}/100)`).join('\n')}

Let's start with the first one. What were you trying to accomplish with this prompt? What context or background information should the AI know?`;

    const userMessage: ChatMessage = { role: 'user' as const, content: 'Draft Better' };
    const nextMessages = [...messages, userMessage, { role: 'assistant' as const, content: '' }];
    setMessages(nextMessages);
    setIsStreaming(true);

    let assistantText = '';
    try {
      await streamChatReply([...messages, userMessage], {
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
      // Fallback to static message if streaming fails
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
    // Just enable normal chat mode
  };

  return (
    <div
      className="min-h-screen px-4 py-6"
      style={{ background: 'linear-gradient(135deg, #e8eaf6 0%, #ede9f7 50%, #e3e8f5 100%)' }}
    >
      <div className="max-w-xl mx-auto">
        {/* Back nav */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 mb-5 text-sm font-semibold transition hover:opacity-70"
          style={{ color: '#4338ca' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Analyze Another Chat
        </button>

        {/* Main results card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/60 p-8 mb-4">
          <h1 className="text-2xl font-bold mb-6" style={{ color: '#1e1b4b' }}>
            Chat Analysis Results
          </h1>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="rounded-2xl p-4" style={{ backgroundColor: '#f0f4ff' }}>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4" style={{ color: '#6366f1' }} />
                <span className="text-sm text-gray-500">Total Messages</span>
              </div>
              <p className="text-3xl font-bold" style={{ color: '#1e1b4b' }}>
                {totalMessages}
              </p>
            </div>
            <div className="rounded-2xl p-4" style={{ backgroundColor: '#f5f0ff' }}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4" style={{ color: '#9333ea' }} />
                <span className="text-sm text-gray-500">Duration</span>
              </div>
              <p className="text-xl font-bold" style={{ color: '#7c3aed' }}>
                {duration}
              </p>
            </div>
          </div>

          {/* Category breakdown */}
          <h2 className="text-base font-bold mb-4" style={{ color: '#1e1b4b' }}>
            Prompt Category Breakdown
          </h2>
          {categories.map((c) => (
            <ProgressBar key={c.name} label={c.name} value={c.pct} max={100} color={c.color} />
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
              color={SCORE_COLORS[s.key] ?? '#4338ca'}
              suffix="/100"
            />
          ))}
        </div>

        {/* Feedback card */}
        {feedbackItems.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/60 p-8 mb-4">
            <div className="flex items-center gap-3 mb-5">
              <Target className="w-5 h-5" style={{ color: '#4338ca' }} />
              <h2 className="text-lg font-bold" style={{ color: '#1e1b4b' }}>
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
            <h2 className="text-base font-bold mb-3" style={{ color: '#1e1b4b' }}>
              Summary
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">{result.summary}</p>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/60 p-6 mb-4">
          <h2 className="text-base font-bold mb-4" style={{ color: '#1e1b4b' }}>
            Live Chat
          </h2>
          <div className="h-[44vh] overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">
                Send a message to start chatting.
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((m, index) => {
                  const isUser = m.role === 'user';
                  return (
                    <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                          isUser ? 'text-white' : 'text-gray-800 bg-gray-100'
                        }`}
                        style={isUser ? { backgroundColor: '#4338ca' } : {}}
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
                      style={{ backgroundColor: '#4338ca' }}
                    >
                      ✍️ Draft Better?
                    </button>
                    <button
                      onClick={handleAskOwn}
                      disabled={isStreaming}
                      className="px-6 py-3 rounded-xl text-sm font-semibold transition hover:opacity-90 disabled:opacity-50 border-2"
                      style={{ 
                        borderColor: '#4338ca',
                        color: '#4338ca',
                        backgroundColor: 'white'
                      }}
                    >
                      💬 Ask Own Questions
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {chatError && <p className="text-xs text-red-500 mt-3">{chatError}</p>}
          <div className="mt-4 flex items-end gap-2">
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
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:border-transparent transition"
              style={{ '--tw-ring-color': '#4338ca' } as { [key: string]: string }}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={isStreaming || !input.trim()}
              className="h-[42px] px-4 rounded-xl text-white text-sm font-semibold flex items-center gap-2"
              style={{
                backgroundColor: isStreaming || !input.trim() ? '#c7c9d9' : '#4338ca',
                cursor: isStreaming || !input.trim() ? 'not-allowed' : 'pointer',
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
        </div>
      </div>
    </div>
  );
}
