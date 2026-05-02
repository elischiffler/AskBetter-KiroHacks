import { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Message } from '../../lib/types';
import { LoadingIndicator } from './LoadingIndicator';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const visibleMessages = messages.filter((m) => m.role !== 'system');

  return (
    <div className="overflow-y-auto max-h-96 px-4 py-3 flex flex-col gap-3">
      {visibleMessages.length === 0 && !isLoading && (
        <p className="text-slate-500 text-sm text-center py-6">
          Ask a follow-up question about your analysis...
        </p>
      )}

      {visibleMessages.map((message, index) => {
        if (message.role === 'user') {
          return (
            <div key={index} className="flex justify-end">
              <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%] text-sm">
                {message.content}
              </div>
            </div>
          );
        }

        // assistant
        return (
          <div key={index} className="flex justify-start">
            <div className="bg-slate-800 text-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%] text-sm prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                disallowedElements={['script', 'iframe', 'object', 'embed']}
                unwrapDisallowed={true}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        );
      })}

      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
            <LoadingIndicator />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
