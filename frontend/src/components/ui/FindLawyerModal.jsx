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

// Human-readable labels + Google Maps search queries per specialization
const SPECIALIZATION_META = {
  criminal:       { label: 'Criminal Lawyer',             query: 'criminal lawyer advocate' },
  constitutional: { label: 'Constitutional Lawyer',       query: 'constitutional lawyer advocate' },
  rti:            { label: 'RTI / Administrative Lawyer', query: 'RTI administrative lawyer' },
  consumer:       { label: 'Consumer Protection Lawyer',  query: 'consumer protection lawyer' },
};

export default function FindLawyerModal({ onClose, specialization = null }) {
  const spec = specialization ? SPECIALIZATION_META[specialization] : null;

  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'denied' | 'error'
  const [coords, setCoords] = useState(null);

  // Request location as soon as modal mounts
  useEffect(() => {
    if (!navigator.geolocation) { setStatus('error'); return; }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus('ready');
      },
      (err) => setStatus(err.code === 1 ? 'denied' : 'error'),
      { timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  // Search term used in both the embed URL and the fallback redirect
  const searchTerm = spec ? spec.query : 'lawyer advocate';
  const searchEncoded = encodeURIComponent(searchTerm + ' near me');

  // Google Maps Embed API URL — requires API key with Maps Embed API enabled
  const embedUrl = coords && MAPS_API_KEY
    ? `https://www.google.com/maps/embed/v1/search?q=${searchEncoded}&center=${coords.lat},${coords.lng}&zoom=14&key=${MAPS_API_KEY}`
    : null;

  // Fallback: opens Google Maps in a new tab (no key needed)
  const redirectUrl = coords
    ? `https://www.google.com/maps/search/${searchEncoded}/@${coords.lat},${coords.lng},14z`
    : `https://www.google.com/maps/search/${searchEncoded}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-navy-900 border border-navy-700 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden"
           style={{ maxHeight: '90vh' }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-saffron-500" />
            <div>
              <h2 className="text-white font-semibold text-lg leading-tight">
                Find a {spec ? spec.label : 'Lawyer'} Near You
              </h2>
              {spec && (
                <p className="text-navy-400 text-xs mt-0.5">
                  Recommended based on your current case
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-navy-400 hover:text-white transition-colors rounded-lg p-1 hover:bg-navy-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* Loading location */}
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <Loader2 className="w-8 h-8 text-saffron-500 animate-spin" />
              <p className="text-navy-300 text-sm">Getting your location…</p>
              <p className="text-navy-500 text-xs">Allow location access when prompted.</p>
            </div>
          )}

          {/* Ready state */}
          {status === 'ready' && (
            <>
              {embedUrl ? (
                /* ── Google Maps iframe embed ── */
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
                /* ── No API key — styled redirect card ── */
                <div className="flex flex-col items-center justify-center gap-5 py-16 px-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-saffron-600/20 flex items-center justify-center">
                    <Navigation className="w-8 h-8 text-saffron-500" />
                  </div>
                  <div>
                    <p className="text-white font-medium mb-1">Your location is ready</p>
                    <p className="text-navy-400 text-sm">
                      Click below to open Google Maps showing{' '}
                      {spec ? spec.label.toLowerCase() + 's' : 'lawyers'} near you.
                    </p>
                  </div>
                  <a
                    href={redirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-saffron-600 hover:bg-saffron-700 text-white font-medium px-6 py-3 rounded-xl transition-colors"
                  >
                    <MapPin className="w-4 h-4" />
                    Open in Google Maps
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <p className="text-navy-600 text-xs">
                    Add <code className="text-navy-400">VITE_GOOGLE_MAPS_API_KEY</code> to{' '}
                    <code className="text-navy-400">frontend/.env</code> to embed the map here.
                  </p>
                </div>
              )}

              {/* Footer — always shown when location is ready */}
              <div className="px-5 py-3 border-t border-navy-700 flex items-center justify-between flex-shrink-0">
                <p className="text-navy-500 text-xs">
                  Near {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </p>
                <a
                  href={redirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-saffron-400 hover:text-saffron-300 text-xs transition-colors"
                >
                  Open in Google Maps
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </>
          )}

          {/* Location denied */}
          {status === 'denied' && (
            <div className="flex flex-col items-center justify-center gap-5 py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <p className="text-white font-medium mb-2">Location access denied</p>
                <p className="text-navy-400 text-sm leading-relaxed">
                  Allow location access in your browser settings, then reopen this panel.
                </p>
              </div>
              <a
                href={`https://www.google.com/maps/search/${searchEncoded}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 border border-saffron-600/50 text-saffron-400 hover:bg-saffron-600/10 font-medium px-6 py-3 rounded-xl transition-colors"
              >
                Search Without Location
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Geolocation unavailable */}
          {status === 'error' && (
            <div className="flex flex-col items-center justify-center gap-5 py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-navy-400" />
              </div>
              <div>
                <p className="text-white font-medium mb-2">Location unavailable</p>
                <p className="text-navy-400 text-sm">
                  Your browser does not support location access.
                </p>
              </div>
              <a
                href={`https://www.google.com/maps/search/${searchEncoded}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-saffron-600 hover:bg-saffron-700 text-white font-medium px-6 py-3 rounded-xl transition-colors"
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
