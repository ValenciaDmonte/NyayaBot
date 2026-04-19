/**
 * components/chat/ChatWindow.jsx
 *
 * Scrollable message list. Auto-scrolls to bottom on new messages.
 * Shows empty state when no messages yet.
 */

import { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

const EXAMPLE_QUERIES = [
  'What is the punishment for theft under BNS 2023?',
  'How do I file an RTI application?',
  'What are my rights if a product is defective?',
  'What are my Fundamental Rights under the Constitution?',
];

export default function ChatWindow({ messages, isLoading, onSend, onNoticeUpload, speechHooks }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-4xl mb-4">⚖️</div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
              Ask your legal question
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md">
              Ask in Hindi, Tamil, Telugu, Bengali, or English. Every answer is grounded in verified Indian law with citations.
            </p>

            <div className="grid sm:grid-cols-2 gap-3 w-full max-w-2xl">
              {EXAMPLE_QUERIES.map((query) => (
                <button
                  key={query}
                  onClick={() => onSend(query)}
                  className="text-left p-3
                             bg-zinc-50 dark:bg-zinc-900
                             border border-zinc-200 dark:border-zinc-700
                             hover:border-gold-500/50 dark:hover:border-gold-500/50
                             rounded-xl text-sm
                             text-zinc-700 dark:text-zinc-300
                             hover:text-zinc-900 dark:hover:text-white
                             transition-all"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message._id}
                message={message}
                speechHooks={speechHooks}
              />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      <MessageInput
        onSend={onSend}
        onNoticeUpload={onNoticeUpload}
        isLoading={isLoading}
        speechHooks={speechHooks}
      />
    </div>
  );
}
