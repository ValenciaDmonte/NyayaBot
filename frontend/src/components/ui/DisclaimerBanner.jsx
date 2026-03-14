/**
 * components/ui/DisclaimerBanner.jsx
 *
 * WHY: Required by design. Shows at top of every chat page.
 * Dismissible per session (stored in sessionStorage, not localStorage —
 * so it reappears on next browser session as a reminder).
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
    <div className="bg-amber-900/40 border-b border-amber-700/50 px-4 py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-amber-300 text-xs">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span>
          <strong>Legal Disclaimer:</strong> NyayaBot provides legal information only — not legal advice.
          Always consult a qualified lawyer for your specific situation.
        </span>
      </div>
      <button
        onClick={handleDismiss}
        className="text-amber-400 hover:text-amber-200 flex-shrink-0"
        aria-label="Dismiss disclaimer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
