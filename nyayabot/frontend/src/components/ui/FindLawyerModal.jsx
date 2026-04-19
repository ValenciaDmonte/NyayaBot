/**
 * components/ui/FindLawyerModal.jsx
 *
 * Finds lawyers near the user using:
 *   - Browser Geolocation API (free, no key needed)
 *   - Google Maps Embed API (requires VITE_GOOGLE_MAPS_API_KEY)
 *   - Fallback: opens Google Maps in a new tab when no key is set
 *
 * Specialization: the search query adapts to the case type detected from
 * the current chat (criminal / constitutional / RTI / consumer).
 */

import { useEffect, useState } from 'react';
import { X, MapPin, ExternalLink, Loader2, AlertTriangle, Navigation } from 'lucide-react';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const SPECIALIZATION_META = {
  criminal:       { label: 'Criminal Lawyer',             query: 'criminal lawyer advocate' },
  constitutional: { label: 'Constitutional Lawyer',       query: 'constitutional lawyer advocate' },
  rti:            { label: 'RTI / Administrative Lawyer', query: 'RTI administrative lawyer' },
  consumer:       { label: 'Consumer Protection Lawyer',  query: 'consumer protection lawyer' },
};

export default function FindLawyerModal({ onClose, specialization = null }) {
  const spec = specialization ? SPECIALIZATION_META[specialization] : null;

  const [status, setStatus] = useState('loading');
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) { setStatus('error'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setStatus('ready'); },
      (err) => setStatus(err.code === 1 ? 'denied' : 'error'),
      { timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const searchTerm    = spec ? spec.query : 'lawyer advocate';
  const searchEncoded = encodeURIComponent(searchTerm + ' near me');

  const embedUrl = coords && MAPS_API_KEY
    ? `https://www.google.com/maps/embed/v1/search?q=${searchEncoded}&center=${coords.lat},${coords.lng}&zoom=14&key=${MAPS_API_KEY}`
    : null;

  const redirectUrl = coords
    ? `https://www.google.com/maps/search/${searchEncoded}/@${coords.lat},${coords.lng},14z`
    : `https://www.google.com/maps/search/${searchEncoded}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative bg-white dark:bg-zinc-900
                   border border-zinc-200 dark:border-zinc-700
                   rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4
                        border-b border-zinc-200 dark:border-zinc-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gold-600 dark:text-gold-500" />
            <div>
              <h2 className="text-zinc-900 dark:text-white font-semibold text-lg leading-tight">
                Find a {spec ? spec.label : 'Lawyer'} Near You
              </h2>
              {spec && (
                <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-0.5">
                  Recommended based on your current case
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 dark:text-zinc-500
                       hover:text-zinc-700 dark:hover:text-white
                       transition-colors rounded-lg p-1
                       hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
              <p className="text-zinc-600 dark:text-zinc-300 text-sm">Getting your location…</p>
              <p className="text-zinc-400 dark:text-zinc-500 text-xs">Allow location access when prompted.</p>
            </div>
          )}

          {status === 'ready' && (
            <>
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title={`${spec ? spec.label : 'Lawyers'} near me`}
                  className="w-full"
                  style={{ height: '440px', border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-5 py-16 px-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-gold-500/15 dark:bg-gold-500/15 bg-gold-100 flex items-center justify-center">
                    <Navigation className="w-8 h-8 text-gold-600 dark:text-gold-500" />
                  </div>
                  <div>
                    <p className="text-zinc-900 dark:text-white font-medium mb-1">Your location is ready</p>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                      Click below to open Google Maps showing{' '}
                      {spec ? spec.label.toLowerCase() + 's' : 'lawyers'} near you.
                    </p>
                  </div>
                  <a
                    href={redirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-white font-medium px-6 py-3 rounded-xl transition-colors"
                  >
                    <MapPin className="w-4 h-4" />
                    Open in Google Maps
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <p className="text-zinc-400 dark:text-zinc-600 text-xs">
                    Add <code className="text-zinc-500 dark:text-zinc-400">VITE_GOOGLE_MAPS_API_KEY</code> to{' '}
                    <code className="text-zinc-500 dark:text-zinc-400">frontend/.env</code> to embed the map here.
                  </p>
                </div>
              )}

              <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between flex-shrink-0">
                <p className="text-zinc-400 dark:text-zinc-500 text-xs">
                  Near {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </p>
                <a
                  href={redirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-300 text-xs transition-colors"
                >
                  Open in Google Maps
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </>
          )}

          {status === 'denied' && (
            <div className="flex flex-col items-center justify-center gap-5 py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
              </div>
              <div>
                <p className="text-zinc-900 dark:text-white font-medium mb-2">Location access denied</p>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                  Allow location access in your browser settings, then reopen this panel.
                </p>
              </div>
              <a
                href={`https://www.google.com/maps/search/${searchEncoded}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2
                           border border-gold-500/50 dark:border-gold-500/50
                           text-gold-700 dark:text-gold-400
                           hover:bg-gold-50 dark:hover:bg-gold-500/10
                           font-medium px-6 py-3 rounded-xl transition-colors"
              >
                Search Without Location
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center gap-5 py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
              </div>
              <div>
                <p className="text-zinc-900 dark:text-white font-medium mb-2">Location unavailable</p>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                  Your browser does not support location access.
                </p>
              </div>
              <a
                href={`https://www.google.com/maps/search/${searchEncoded}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-white font-medium px-6 py-3 rounded-xl transition-colors"
              >
                Find Lawyers on Google Maps
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
