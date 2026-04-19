/**
 * components/chat/MessageBubble.jsx
 *
 * Renders a single message bubble.
 * User messages: right-aligned, gold accent
 * Assistant messages: left-aligned, dark card with:
 *   - Markdown rendering (react-markdown)
 *   - Citation panel (collapsible)
 *   - Voice output button
 *   - Repealed law warning if applicable
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, FileText } from 'lucide-react';
import CitationPanel from '../citations/CitationPanel';
import VoiceOutputButton from '../ui/VoiceOutputButton';
import TypingIndicator from './TypingIndicator';
import LegitimacyBadge from './LegitimacyBadge';

export default function MessageBubble({ message, speechHooks }) {
  const { role, content, ragMetadata, hasRepealedWarning, detectedLanguage, isTyping, createdAt, usedNoticeContext } = message;
  const { speak, stopSpeaking, isSpeaking, outputSupported } = speechHooks || {};

  if (isTyping) return <TypingIndicator />;

  const isUser = role === 'user';
  const citations = ragMetadata?.citations || [];
  const isNoticeAnalysis = message.isNoticeAnalysis === true;
  const legitimacyCheck  = ragMetadata?.legitimacyCheck || null;

  const langBcp47 = {
    en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN',
    te: 'te-IN', bn: 'bn-IN', mr: 'mr-IN', kn: 'kn-IN',
  }[detectedLanguage] || 'en-IN';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[80%] ${isUser ? 'max-w-[70%]' : 'max-w-[85%]'}`}>
        {/* Message content */}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-gold-500 text-white rounded-br-sm'
              : 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-bl-sm'
          }`}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
          ) : (
            <>
              <div className="prose prose-sm max-w-none
                              prose-p:text-zinc-700 dark:prose-p:text-zinc-300
                              prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100
                              prose-li:text-zinc-700 dark:prose-li:text-zinc-300
                              prose-headings:text-zinc-900 dark:prose-headings:text-zinc-100">

                {/* Notice Q&A badge */}
                {usedNoticeContext && !isNoticeAnalysis && (
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-zinc-200 dark:border-zinc-700 not-prose">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/15 dark:bg-blue-500/15 bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-blue-700 dark:text-blue-300 text-xs font-semibold tracking-wide uppercase m-0">
                      Answering from your uploaded notice
                    </p>
                  </div>
                )}

                {/* Notice analysis badge */}
                {isNoticeAnalysis && (
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-zinc-200 dark:border-zinc-700 not-prose">
                    <div className="w-7 h-7 rounded-lg bg-gold-500/15 dark:bg-gold-500/15 bg-gold-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-3.5 h-3.5 text-gold-600 dark:text-gold-400" />
                    </div>
                    <div>
                      <p className="text-gold-700 dark:text-gold-300 text-xs font-semibold tracking-wide uppercase m-0">Legal Notice Analysis</p>
                      <p className="text-zinc-500 dark:text-zinc-500 text-xs m-0">Plain-language explanation of your document</p>
                    </div>
                  </div>
                )}

                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    strong: ({ children }) => <strong className="text-gold-700 dark:text-gold-300 font-semibold">{children}</strong>,
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-gold-600 dark:text-gold-400 hover:underline">
                        {children}
                      </a>
                    ),
                    ul: ({ children }) => <ul className="list-disc list-inside space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-zinc-700 dark:text-zinc-300">{children}</li>,
                    p:  ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                    h1: ({ children }) => <h1 className="text-base font-bold text-gold-700 dark:text-gold-300 mb-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-sm font-bold text-gold-700 dark:text-gold-300 mb-1">{children}</h2>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-gold-500 pl-3 italic text-zinc-600 dark:text-zinc-400">{children}</blockquote>
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>

              {/* LegitimacyBadge outside prose so its colours are not overridden */}
              {isNoticeAnalysis && (
                <LegitimacyBadge legitimacyCheck={legitimacyCheck} />
              )}
            </>
          )}
        </div>

        {/* Assistant message footer */}
        {!isUser && (
          <div className="px-1 mt-1">
            {hasRepealedWarning && (
              <div className="flex items-center gap-2 text-red-500 dark:text-red-400 text-xs mb-2
                              bg-red-50 dark:bg-red-900/20
                              border border-red-200 dark:border-red-700/30
                              rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>This answer references a <strong>repealed law</strong>. Check the citations below for the current law.</span>
              </div>
            )}

            <CitationPanel citations={citations} hasRepealedWarning={hasRepealedWarning} />

            <div className="flex items-center justify-between mt-2">
              <VoiceOutputButton
                content={content}
                language={langBcp47}
                isSpeaking={isSpeaking}
                onSpeak={speak}
                onStop={stopSpeaking}
                isSupported={outputSupported}
              />
              {createdAt && (
                <span className="text-xs text-zinc-400 dark:text-zinc-600">
                  {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        )}

        {/* User message timestamp */}
        {isUser && createdAt && (
          <div className="flex justify-end mt-1 pr-1">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
