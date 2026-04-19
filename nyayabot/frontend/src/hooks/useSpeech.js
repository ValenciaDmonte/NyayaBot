/**
 * hooks/useSpeech.js
 *
 * WHY Web Speech API (browser native) over Google Cloud STT/TTS:
 * - Zero cost, zero new API keys
 * - Chrome/Edge support Hindi, Tamil, Telugu, Bengali, Marathi, Kannada
 * - Available to ~80% of Indian mobile users (Chrome is dominant)
 * - Firefox lacks SpeechRecognition — we detect this and hide the mic button
 *
 * This hook exposes two groups of functions:
 * 1. Voice INPUT: mic → live transcript → fills textarea
 * 2. Voice OUTPUT: text → spoken aloud in the detected language
 *
 * CRITICAL: The `lang` property on SpeechRecognition must use BCP-47
 * with the India region code (e.g. 'hi-IN' not 'hi') for correct accent
 * recognition. Without '-IN', Chrome uses US-English accent models.
 */

import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * @param {string} bcp47Language - BCP-47 language code e.g. 'hi-IN', 'en-IN'
 */
export function useSpeech(bcp47Language = 'en-IN') {
  // ── Feature detection ────────────────────────────────────────────────────
  const SpeechRecognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const inputSupported = !!SpeechRecognition;
  const outputSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  // ── Voice Input state ────────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  // ── Voice Output state ───────────────────────────────────────────────────
  const [isSpeaking, setIsSpeaking] = useState(false);

  // ── Update recognition language when user changes language selector ──────
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = bcp47Language;
    }
  }, [bcp47Language]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (outputSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [outputSupported]);

  /**
   * Start voice recognition.
   * Sets isListening = true, begins filling `transcript` with live text.
   */
  const startListening = useCallback(() => {
    if (!inputSupported || isListening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = bcp47Language;
    recognition.continuous = false;      // Stop after first pause
    recognition.interimResults = true;   // Show live transcript while speaking

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event) => {
      // Combine all result segments (interim + final)
      let fullTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript;
      }
      setTranscript(fullTranscript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      // 'aborted' is not an error — user clicked stop
      if (event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [inputSupported, isListening, bcp47Language, SpeechRecognition]);

  /**
   * Stop voice recognition manually.
   * The `onend` event will fire and set isListening = false.
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  /**
   * Clear the current transcript (called after user submits the query).
   */
  const clearTranscript = useCallback(() => setTranscript(''), []);

  /**
   * Speak text aloud using the browser's TTS engine.
   *
   * @param {string} text - The text to speak (will be stripped of markdown)
   * @param {string} lang - BCP-47 language code for this specific text
   */
  const speak = useCallback(
    (text, lang = bcp47Language) => {
      if (!outputSupported) return;

      // Cancel any currently playing speech first
      window.speechSynthesis.cancel();

      // Strip markdown before speaking — TTS doesn't understand *bold* or ## headers
      // WHY: Legal answers contain markdown formatting from Gemini
      const plainText = text
        .replace(/[#*`_\[\]]/g, '')    // Remove markdown symbols
        .replace(/\n{2,}/g, '. ')       // Double newlines → sentence pause
        .replace(/\n/g, ' ')            // Single newlines → space
        .replace(/⚠️/g, 'Warning:')    // Replace emoji with spoken word
        .trim();

      const utterance = new SpeechSynthesisUtterance(plainText);
      utterance.lang = lang;
      utterance.rate = 0.9;   // Slightly slower than default for legal content
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [outputSupported, bcp47Language]
  );

  /**
   * Stop any currently playing speech.
   */
  const stopSpeaking = useCallback(() => {
    if (outputSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [outputSupported]);

  return {
    // Voice Input
    isListening,
    startListening,
    stopListening,
    transcript,
    clearTranscript,
    inputSupported,

    // Voice Output
    isSpeaking,
    speak,
    stopSpeaking,
    outputSupported,
  };
}
