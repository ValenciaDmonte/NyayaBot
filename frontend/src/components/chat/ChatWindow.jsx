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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          // Empty state — show example questions
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-4xl mb-4">⚖️</div>
            <h2 className="text-xl font-bold text-white mb-2">
              Ask your legal question
            </h2>
            <p className="text-navy-300 mb-8 max-w-md">
              Ask in Hindi, Tamil, Telugu, Bengali, or English. Every answer is grounded in verified Indian law with citations.
            </p>

            {/* Example queries */}
            <div className="grid sm:grid-cols-2 gap-3 w-full max-w-2xl">
              {EXAMPLE_QUERIES.map((query) => (
                <button
                  key={query}
                  onClick={() => onSend(query)}
                  className="text-left p-3 bg-navy-800 border border-navy-600 hover:border-saffron-600/50 rounded-xl text-sm text-navy-200 hover:text-white transition-all"
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

      {/* Input */}
      <MessageInput
        onSend={onSend}
        onNoticeUpload={onNoticeUpload}
        isLoading={isLoading}
        speechHooks={speechHooks}
      />
    </div>
  );
}
