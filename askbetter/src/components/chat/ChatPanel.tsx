import { useMemo } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useChatApi } from '../../hooks/useChatApi';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import type { Message } from '../../lib/types';

interface ChatPanelProps {
  systemPrompt?: string;
}

export function ChatPanel({ systemPrompt }: ChatPanelProps) {
  const initialMessages = useMemo<Message[]>(() => {
    if (systemPrompt) {
      return [{ role: 'system', content: systemPrompt }];
    }
    return [];
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { messages, isLoading, error, sendMessage, clearError } = useChatApi({
    initialMessages,
  });

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700">
        <MessageCircle className="w-4 h-4 text-indigo-400" />
        <span className="text-white font-semibold text-sm">Ask a follow-up</span>
      </div>

      {/* Message list */}
      <MessageList messages={messages} isLoading={isLoading} />

      {/* Error banner */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm px-4 py-2 flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={clearError}
            className="ml-2 text-red-400 hover:text-red-200 transition"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input */}
      <MessageInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}
