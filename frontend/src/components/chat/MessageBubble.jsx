/**
 * components/chat/MessageBubble.jsx
 *
 * Renders a single message bubble.
 * User messages: right-aligned, saffron accent
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

  // Show typing indicator while waiting for response
  if (isTyping) return <TypingIndicator />;

  const isUser = role === 'user';
  const citations = ragMetadata?.citations || [];
  const isNoticeAnalysis = message.isNoticeAnalysis === true;
  const legitimacyCheck = ragMetadata?.legitimacyCheck || null;

  // Language BCP-47 for TTS (detected from the message)
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
              ? 'bg-saffron-600 text-white rounded-br-sm'
              : 'bg-navy-800 border border-navy-600 text-white rounded-bl-sm'
          }`}
        >
          {isUser ? (
            // User messages: plain text
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
          ) : (
            // Assistant messages: render markdown safely
            // Fragment needed so LegitimacyBadge can sit outside prose without an extra wrapper div
            <>
            <div className="prose prose-invert prose-sm max-w-none">
              {/* Notice Q&A badge — shown on follow-up answers that used the uploaded notice */}
              {usedNoticeContext && !isNoticeAnalysis && (
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-navy-600">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <p className="text-blue-300 text-xs font-semibold tracking-wide uppercase m-0">
                    Answering from your uploaded notice
                  </p>
                </div>
              )}

              {/* Notice analysis badge */}
              {isNoticeAnalysis && (
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-navy-600">
                  <div className="w-7 h-7 rounded-lg bg-saffron-600/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-3.5 h-3.5 text-saffron-400" />
                  </div>
                  <div>
                    <p className="text-saffron-300 text-xs font-semibold tracking-wide uppercase m-0">Legal Notice Analysis</p>
                    <p className="text-navy-400 text-xs m-0">Plain-language explanation of your document</p>
                  </div>
                </div>
              )}
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Style markdown elements to match our theme
                  strong: ({ children }) => <strong className="text-saffron-300">{children}</strong>,
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-saffron-400 hover:underline">
                      {children}
                    </a>
                  ),
                  ul: ({ children }) => <ul className="list-disc list-inside space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="text-navy-100">{children}</li>,
                  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                  h1: ({ children }) => <h1 className="text-base font-bold text-saffron-300 mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-sm font-bold text-saffron-300 mb-1">{children}</h2>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-saffron-600 pl-3 italic text-navy-200">{children}</blockquote>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>

            {/* Legitimacy check panel — outside prose so Tailwind prose styles don't override badge colours */}
            {isNoticeAnalysis && (
              <LegitimacyBadge legitimacyCheck={legitimacyCheck} />
            )}
            </>
          )}
        </div>

        {/* Assistant message footer: citations + voice button */}
        {!isUser && (
          <div className="px-1 mt-1">
            {/* Repealed warning banner */}
            {hasRepealedWarning && (
              <div className="flex items-center gap-2 text-red-400 text-xs mb-2 bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>This answer references a <strong>repealed law</strong>. Check the citations below for the current law.</span>
              </div>
            )}

            {/* Citations */}
            <CitationPanel citations={citations} hasRepealedWarning={hasRepealedWarning} />

            {/* Voice output + timestamp row */}
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
                <span className="text-xs text-navy-500">
                  {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        )}

        {/* User message timestamp */}
        {isUser && createdAt && (
          <div className="flex justify-end mt-1 pr-1">
            <span className="text-xs text-navy-400">
              {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
