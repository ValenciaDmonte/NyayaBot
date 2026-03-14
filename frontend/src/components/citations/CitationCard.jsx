/**
 * components/citations/CitationCard.jsx
 *
 * WHY: Raw citation text buried in an answer is hard to read.
 * Cards make it scannable and provide direct links to the official source.
 *
 * Visual states:
 * - Normal: teal-tinted card
 * - Repealed: red badge + muted styling (law no longer applies)
 * - Recently amended (< 6 months): amber badge (law may have changed)
 */

import { ExternalLink, AlertTriangle, Clock } from 'lucide-react';
import { formatDistanceToNow, differenceInMonths, parseISO } from 'date-fns';

export default function CitationCard({ citation }) {
  const {
    lawName,
    lawCode,
    section,
    sectionTitle,
    lastAmended,
    sourceUrl,
    isRepealed,
    replacedBy,
    similarityScore,
  } = citation;

  // Check if recently amended (within last 6 months)
  const isRecentlyAmended =
    !isRepealed &&
    lastAmended &&
    differenceInMonths(new Date(), parseISO(lastAmended)) < 6;

  return (
    <div
      className={`rounded-xl border p-4 text-sm transition-all ${
        isRepealed
          ? 'bg-red-900/20 border-red-700/50'
          : 'bg-navy-700/50 border-navy-600 hover:border-saffron-600/50'
      }`}
    >
      {/* Header row: law code + badges */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-navy-600 text-navy-200 text-xs font-mono px-2 py-0.5 rounded">
            {lawCode}
          </span>

          {isRepealed && (
            <span className="flex items-center gap-1 bg-red-900/50 text-red-400 text-xs px-2 py-0.5 rounded-full border border-red-700/50">
              <AlertTriangle className="w-3 h-3" />
              REPEALED
            </span>
          )}

          {isRecentlyAmended && (
            <span className="flex items-center gap-1 bg-amber-900/50 text-amber-400 text-xs px-2 py-0.5 rounded-full border border-amber-700/50">
              <Clock className="w-3 h-3" />
              Recently Amended
            </span>
          )}
        </div>

        {/* Similarity score — shows how relevant this source is */}
        <span className="text-xs text-navy-400 flex-shrink-0">
          {Math.round(similarityScore * 100)}% match
        </span>
      </div>

      {/* Law name + section */}
      <p className="font-semibold text-white mb-0.5">{lawName}</p>
      {section && (
        <p className="text-navy-200">
          Section {section}
          {sectionTitle ? ` — ${sectionTitle}` : ''}
        </p>
      )}

      {/* Amendment date */}
      {lastAmended && (
        <p className="text-navy-400 text-xs mt-1">
          Last amended: {lastAmended}
        </p>
      )}

      {/* Replaced by (for repealed laws) */}
      {isRepealed && replacedBy && (
        <p className="text-red-300 text-xs mt-2">
          ↳ Replaced by: <span className="font-medium">{replacedBy}</span>
        </p>
      )}

      {/* Source link */}
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-saffron-500 hover:text-saffron-400 text-xs mt-3 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          View official source
        </a>
      )}
    </div>
  );
}
