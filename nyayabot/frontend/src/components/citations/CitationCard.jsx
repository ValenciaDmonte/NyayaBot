/**
 * components/citations/CitationCard.jsx
 *
 * Visual states:
 * - Normal: subtle zinc card
 * - Repealed: red badge + muted styling
 * - Recently amended (< 6 months): amber badge
 */

import { ExternalLink, AlertTriangle, Clock } from 'lucide-react';
import { differenceInMonths, parseISO } from 'date-fns';

export default function CitationCard({ citation }) {
  const {
    lawName, lawCode, section, sectionTitle,
    lastAmended, sourceUrl, isRepealed, replacedBy, similarityScore,
  } = citation;

  const isRecentlyAmended =
    !isRepealed &&
    lastAmended &&
    differenceInMonths(new Date(), parseISO(lastAmended)) < 6;

  return (
    <div
      className={`rounded-xl border p-4 text-sm transition-all ${
        isRepealed
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50'
          : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:border-gold-500/50 dark:hover:border-gold-500/50'
      }`}
    >
      {/* Header: law code + badges + match score */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-mono px-2 py-0.5 rounded">
            {lawCode}
          </span>

          {isRepealed && (
            <span className="flex items-center gap-1
                             bg-red-100 dark:bg-red-900/50
                             text-red-700 dark:text-red-400
                             text-xs px-2 py-0.5 rounded-full
                             border border-red-200 dark:border-red-700/50">
              <AlertTriangle className="w-3 h-3" />
              REPEALED
            </span>
          )}

          {isRecentlyAmended && (
            <span className="flex items-center gap-1
                             bg-amber-100 dark:bg-amber-900/50
                             text-amber-700 dark:text-amber-400
                             text-xs px-2 py-0.5 rounded-full
                             border border-amber-200 dark:border-amber-700/50">
              <Clock className="w-3 h-3" />
              Recently Amended
            </span>
          )}
        </div>

        <span className="text-xs text-zinc-400 dark:text-zinc-500 flex-shrink-0">
          {Math.round(similarityScore * 100)}% match
        </span>
      </div>

      <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-0.5">{lawName}</p>
      {section && (
        <p className="text-zinc-600 dark:text-zinc-300">
          Section {section}{sectionTitle ? ` — ${sectionTitle}` : ''}
        </p>
      )}

      {lastAmended && (
        <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">
          Last amended: {lastAmended}
        </p>
      )}

      {isRepealed && replacedBy && (
        <p className="text-red-600 dark:text-red-300 text-xs mt-2">
          ↳ Replaced by: <span className="font-medium">{replacedBy}</span>
        </p>
      )}

      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1
                     text-gold-600 dark:text-gold-500
                     hover:text-gold-700 dark:hover:text-gold-400
                     text-xs mt-3 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          View official source
        </a>
      )}
    </div>
  );
}
