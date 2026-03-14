/**
 * components/ui/VoiceOutputButton.jsx
 *
 * Speaker button on each assistant message. Reads the answer aloud
 * using the browser's Text-to-Speech engine in the detected language.
 *
 * SpeechSynthesis is supported in Chrome, Firefox, Safari, and Edge —
 * much wider than SpeechRecognition. We show this on all browsers.
 */

import { Volume2, StopCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VoiceOutputButton({
  content,
  language,
  isSpeaking,
  onSpeak,
  onStop,
  isSupported,
}) {
  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={isSpeaking ? onStop : () => onSpeak(content, language)}
      className={`p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 ${
        isSpeaking
          ? 'text-saffron-400 bg-saffron-600/20'
          : 'text-navy-400 hover:text-saffron-400 hover:bg-navy-700'
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
