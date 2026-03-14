/**
 * components/chat/LegitimacyBadge.jsx
 *
 * Renders the notice legitimacy check panel below a legal notice analysis message.
 *
 * ETHICAL DESIGN NOTES (baked into copy, not just labels):
 * - Risk level labels use "indicators" language — never "this is fraud/genuine"
 * - Disclaimer is ALWAYS shown regardless of riskLevel
 * - HIGH risk adds cybercrime.gov.in reporting link
 * - Collapsible by default on LOW (no urgency); expanded on MEDIUM and HIGH
 *   so users cannot miss important warnings
 *
 * WHY a separate component (not inline in MessageBubble):
 * - It has its own internal state (collapsed/expanded)
 * - Only conditionally rendered, keeping MessageBubble clean
 *
 * @param {{ riskLevel, redFlags, legitimacyIndicators, summary }} legitimacyCheck
 */

import { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

// ── Config per risk level ────────────────────────────────────────────────────
// All risk-level-specific styling and copy in one place so thresholds are
// easy to adjust and the JSX below stays readable.
const RISK_CONFIG = {
  low: {
    label: 'Low Risk Indicators',
    sublabel: 'No obvious red flags detected',
    headerBg: 'bg-green-900/20',
    headerBorder: 'border-green-700/40',
    labelColor: 'text-green-300',
    sublabelColor: 'text-green-500',
    iconColor: 'text-green-400',
    iconBg: 'bg-green-600/20',
    Icon: ShieldCheck,
    defaultOpen: false,   // Collapse — no urgency for low risk
  },
  medium: {
    label: 'Medium Risk Indicators',
    sublabel: 'Some structural concerns found',
    headerBg: 'bg-amber-900/20',
    headerBorder: 'border-amber-700/40',
    labelColor: 'text-amber-300',
    sublabelColor: 'text-amber-500',
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-600/20',
    Icon: ShieldQuestion,
    defaultOpen: true,    // Expand — user should read the concerns
  },
  high: {
    label: 'High Risk Indicators',
    sublabel: 'Multiple fraud indicators detected',
    headerBg: 'bg-red-900/20',
    headerBorder: 'border-red-700/40',
    labelColor: 'text-red-300',
    sublabelColor: 'text-red-400',
    iconColor: 'text-red-400',
    iconBg: 'bg-red-600/20',
    Icon: ShieldAlert,
    defaultOpen: true,    // Always expanded for HIGH — critical information
  },
};

export default function LegitimacyBadge({ legitimacyCheck }) {
  // Guard: if legitimacyCheck is null (old messages loaded from history before
  // this feature shipped, or legitimacy check failed), render nothing silently.
  if (!legitimacyCheck || !legitimacyCheck.riskLevel) return null;

  const { riskLevel, redFlags = [], legitimacyIndicators = [], summary } = legitimacyCheck;
  const config = RISK_CONFIG[riskLevel] || RISK_CONFIG.low;
  const { Icon } = config;

  const [isOpen, setIsOpen] = useState(config.defaultOpen);

  return (
    <div className={`mt-3 rounded-xl border ${config.headerBorder} overflow-hidden`}>

      {/* ── Collapsible header ─────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center gap-3 px-4 py-3 ${config.headerBg} hover:opacity-90 transition-opacity text-left`}
      >
        {/* Shield icon */}
        <div className={`w-7 h-7 rounded-lg ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
        </div>

        {/* Labels */}
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold tracking-wide uppercase m-0 ${config.labelColor}`}>
            {config.label}
          </p>
          <p className={`text-xs m-0 ${config.sublabelColor}`}>{config.sublabel}</p>
        </div>

        {/* Counts + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {redFlags.length > 0 && (
            <span className="text-xs text-red-400 font-medium">
              {redFlags.length} flag{redFlags.length !== 1 ? 's' : ''}
            </span>
          )}
          {legitimacyIndicators.length > 0 && (
            <span className="text-xs text-green-400 font-medium">
              {legitimacyIndicators.length} green
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-navy-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* ── Expanded body ──────────────────────────────────────────────── */}
      {isOpen && (
        <div className="bg-navy-900/60 px-4 py-3 space-y-3">

          {/* Summary sentence from the LLM */}
          {summary && (
            <p className="text-navy-200 text-xs leading-relaxed">{summary}</p>
          )}

          {/* Red flags */}
          {redFlags.length > 0 && (
            <div>
              <p className="text-red-400 text-xs font-semibold uppercase tracking-wide mb-1.5">
                Warning Signs Found
              </p>
              <ul className="space-y-1.5">
                {redFlags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-navy-200 text-xs leading-snug">{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Legitimacy markers */}
          {legitimacyIndicators.length > 0 && (
            <div>
              <p className="text-green-400 text-xs font-semibold uppercase tracking-wide mb-1.5">
                Legitimacy Markers Found
              </p>
              <ul className="space-y-1.5">
                {legitimacyIndicators.map((indicator, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-navy-200 text-xs leading-snug">{indicator}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* HIGH risk only: cybercrime reporting link */}
          {riskLevel === 'high' && (
            <div className="flex items-start gap-2 bg-red-900/30 border border-red-700/40 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 text-xs font-medium mb-0.5">
                  If you believe this notice is fraudulent:
                </p>
                <p className="text-red-400 text-xs">
                  Report to the{' '}
                  <a
                    href="https://cybercrime.gov.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-red-200 inline-flex items-center gap-0.5"
                  >
                    National Cyber Crime Portal
                    <ExternalLink className="w-2.5 h-2.5 inline ml-0.5" />
                  </a>{' '}
                  or your local police station.
                </p>
              </div>
            </div>
          )}

          {/* Mandatory disclaimer — shown for ALL risk levels */}
          <div className="flex items-start gap-2 bg-navy-800/60 border border-navy-600/40 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-navy-300 text-xs leading-snug">
              <strong className="text-amber-300">This is not a definitive assessment.</strong>{' '}
              These are observable structural signals only. A notice with no red flags may still
              be fraudulent, and a notice with red flags may be legitimate. Please verify with a
              qualified lawyer before taking any action.
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
