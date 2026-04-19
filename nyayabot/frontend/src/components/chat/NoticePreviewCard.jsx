/**
 * components/chat/NoticePreviewCard.jsx
 *
 * Shown above the textarea after a user selects a legal notice file.
 * Displays filename + size and a privacy note before they hit send.
 */

import { FileText, Image, X, ShieldCheck } from 'lucide-react';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NoticePreviewCard({ file, onRemove }) {
  const isPdf = file.type === 'application/pdf';
  const Icon = isPdf ? FileText : Image;

  return (
    <div className="mb-2 flex items-start gap-3
                    bg-zinc-50 dark:bg-zinc-900
                    border border-zinc-200 dark:border-zinc-700
                    rounded-xl px-4 py-3">
      <div className="w-8 h-8 rounded-lg bg-gold-500/15 dark:bg-gold-500/15 bg-gold-100
                      flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-gold-600 dark:text-gold-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-zinc-900 dark:text-zinc-100 text-sm font-medium truncate">{file.name}</p>
        <p className="text-zinc-500 dark:text-zinc-500 text-xs">{formatBytes(file.size)}</p>
        <div className="flex items-center gap-1 mt-1.5">
          <ShieldCheck className="w-3 h-3 text-green-500 dark:text-green-400 flex-shrink-0" />
          <p className="text-green-600 dark:text-green-400 text-xs">
            Extracted text is kept in this session to answer follow-up questions.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors flex-shrink-0 mt-0.5"
        title="Remove file"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
