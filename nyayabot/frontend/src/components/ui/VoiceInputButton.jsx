/**
 * components/ui/VoiceInputButton.jsx
 *
 * Microphone button for hands-free legal queries.
 * Shows pulsing red ring while recording.
 * Hidden on Firefox (no SpeechRecognition support).
 */

import { Mic, MicOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VoiceInputButton({ isListening, onStart, onStop, isSupported }) {
  if (!isSupported) return null;

  return (
    <div className="relative">
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
            : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-gold-600 dark:hover:text-gold-400'
        }`}
        title={isListening ? 'Stop recording' : 'Voice input (Chrome/Edge)'}
      >
        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>
    </div>
  );
}
