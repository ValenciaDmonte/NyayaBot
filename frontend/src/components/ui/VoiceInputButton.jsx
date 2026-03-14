/**
 * components/ui/VoiceInputButton.jsx
 *
 * WHY: Microphone button for hands-free legal queries.
 * Uses Web Speech API — no extra cost, no new API keys.
 * Shows pulsing red ring while recording (universal recording signal).
 *
 * If SpeechRecognition is unsupported (Firefox), the button is hidden.
 * We never break the UI — just gracefully absent on unsupported browsers.
 */

import { Mic, MicOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VoiceInputButton({
  isListening,
  onStart,
  onStop,
  isSupported,
}) {
  if (!isSupported) return null; // Hidden on Firefox

  return (
    <div className="relative">
      {/* Pulsing ring while recording */}
      {isListening && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-red-500"
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
      )}

      <button
        type="button"
        onClick={isListening ? onStop : onStart}
        className={`relative p-2 rounded-full transition-all ${
          isListening
            ? 'bg-red-600 hover:bg-red-700 text-white voice-recording'
            : 'bg-navy-700 hover:bg-navy-600 text-navy-200 hover:text-saffron-400'
        }`}
        title={isListening ? 'Stop recording' : 'Voice input (Chrome/Edge)'}
      >
        {isListening ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}
