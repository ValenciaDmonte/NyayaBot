/**
 * components/ui/VoiceOutputButton.jsx
 *
 * Speaker button on each assistant message. Reads the answer aloud
 * using the browser's Text-to-Speech engine in the detected language.
 */

import { Volume2, StopCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VoiceOutputButton({ content, language, isSpeaking, onSpeak, onStop, isSupported }) {
  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={isSpeaking ? onStop : () => onSpeak(content, language)}
      className={`p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 ${
        isSpeaking
          ? 'text-gold-600 dark:text-gold-400 bg-gold-500/15 dark:bg-gold-500/15 bg-gold-50'
          : 'text-zinc-400 dark:text-zinc-500 hover:text-gold-600 dark:hover:text-gold-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
      }`}
      title={isSpeaking ? 'Stop speaking' : 'Listen to answer'}
    >
      {isSpeaking ? (
        <>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
          >
            <StopCircle className="w-4 h-4" />
          </motion.div>
          <span>Stop</span>
        </>
      ) : (
        <>
          <Volume2 className="w-4 h-4" />
          <span>Listen</span>
        </>
      )}
    </button>
  );
}
