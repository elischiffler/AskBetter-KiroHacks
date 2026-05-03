import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Loader2, Send, Trash2 } from 'lucide-react';
import { streamChatReply, type ChatMessage } from '../lib/chatClient';

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || isStreaming) return;

    setError('');
    setInput('');

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
      setError(message);
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

  const clearConversation = () => {
    if (messages.length === 0) return;

    const confirmed = window.confirm('Clear this conversation? This cannot be undone.');
    if (confirmed) {
      setMessages([]);
      setError('');
    }
  };

  const isDisabled = isStreaming || !input.trim();
  const canClear = messages.length > 0 && !isStreaming;

  return (
    <div
      className="min-h-screen px-4 py-6"
      style={{ background: 'linear-gradient(135deg, #e8eaf6 0%, #ede9f7 50%, #e3e8f5 100%)' }}
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              window.location.href = '/#analyze';
            }}
            className="flex items-center gap-2 text-sm font-semibold hover:opacity-70 transition"
            style={{ color: '#4338ca' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Analyzer
          </button>
          <h1 className="text-xl font-bold" style={{ color: '#1e1b4b' }}>
            Chat
          </h1>
          <button
            onClick={clearConversation}
            disabled={!canClear}
            className="flex items-center gap-2 text-sm font-semibold hover:opacity-70 transition disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ color: '#4338ca' }}
            title="Clear conversation"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/60 p-5 md:p-6">
          <div className="h-[58vh] overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">
                Start the conversation by sending a message.
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
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

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
              disabled={isDisabled}
              className="h-[42px] px-4 rounded-xl text-white text-sm font-semibold flex items-center gap-2"
              style={{
                backgroundColor: isDisabled ? '#c7c9d9' : '#4338ca',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
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
