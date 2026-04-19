/**
 * components/chat/TypingIndicator.jsx
 *
 * WHY: Responses take 3-8 seconds. Without a visual indicator,
 * users think the app is broken and submit the same query twice.
 */

export default function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4 animate-fade-in">
      <div className="bg-zinc-100 dark:bg-zinc-900
                      border border-zinc-200 dark:border-zinc-700
                      rounded-2xl rounded-tl-sm px-4 py-3 max-w-xs">
        <div className="flex items-center gap-1.5">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
          <span className="text-zinc-400 dark:text-zinc-500 text-xs ml-2">Consulting legal sources...</span>
        </div>
      </div>
    </div>
  );
}
