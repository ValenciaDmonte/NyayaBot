/**
 * components/chat/TypingIndicator.jsx
 *
 * WHY: Gemini responses take 3-8 seconds. Without a visual indicator,
 * users think the app is broken and submit the same query twice.
 * Three bouncing dots are the universal "thinking" signal.
 */

export default function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4 animate-fade-in">
      <div className="bg-navy-800 border border-navy-600 rounded-2xl rounded-tl-sm px-4 py-3 max-w-xs">
        <div className="flex items-center gap-1.5">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
          <span className="text-navy-300 text-xs ml-2">Consulting legal sources...</span>
        </div>
      </div>
    </div>
  );
}
