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
    <div className="mb-2 flex items-start gap-3 bg-navy-800 border border-navy-600 rounded-xl px-4 py-3">
      <div className="w-8 h-8 rounded-lg bg-saffron-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-saffron-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{file.name}</p>
        <p className="text-navy-400 text-xs">{formatBytes(file.size)}</p>
        <div className="flex items-center gap-1 mt-1.5">
          <ShieldCheck className="w-3 h-3 text-green-400 flex-shrink-0" />
          <p className="text-green-400 text-xs">Extracted text is kept in this session to answer follow-up questions.</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="text-navy-400 hover:text-white transition-colors flex-shrink-0 mt-0.5"
        title="Remove file"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
