/**
 * components/citations/CitationPanel.jsx
 *
 * Collapsible panel that shows 1-3 citation cards below an assistant message.
 * Collapsed by default to keep the chat uncluttered.
 */

import { useState } from 'react';
import { ChevronDown, BookOpen } from 'lucide-react';
import CitationCard from './CitationCard';

export default function CitationPanel({ citations, hasRepealedWarning }) {
  const [isOpen, setIsOpen] = useState(hasRepealedWarning);

  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs
                   text-gold-600 dark:text-gold-500
                   hover:text-gold-700 dark:hover:text-gold-400
                   transition-colors"
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span>
          {citations.length} source{citations.length > 1 ? 's' : ''}
          {hasRepealedWarning && (
            <span className="ml-1 text-red-500 dark:text-red-400">⚠️ contains repealed law</span>
          )}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="mt-2 space-y-2">
          {citations.map((citation, i) => (
            <CitationCard key={citation.vectorId || i} citation={citation} />
          ))}
        </div>
      )}
    </div>
  );
}
