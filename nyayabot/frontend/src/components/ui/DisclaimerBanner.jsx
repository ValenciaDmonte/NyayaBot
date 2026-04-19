/**
 * components/ui/DisclaimerBanner.jsx
 *
 * Dismissible per session (sessionStorage — reappears each browser session).
 */

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function DisclaimerBanner() {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('disclaimer_dismissed') === 'true'
  );

  if (dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem('disclaimer_dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-900/30
                    border-b border-amber-200 dark:border-amber-700/50
                    px-4 py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span>
          <strong>Legal Disclaimer:</strong> NyayaBot provides legal information only — not legal advice.
          Always consult a qualified lawyer for your specific situation.
        </span>
      </div>
      <button
        onClick={handleDismiss}
        className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 flex-shrink-0 transition-colors"
        aria-label="Dismiss disclaimer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
