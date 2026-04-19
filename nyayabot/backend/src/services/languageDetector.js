/**
 * services/languageDetector.js
 *
 * WHY: We need to know the user's language for two reasons:
 * 1. Tell Gemini which language to respond in
 * 2. Set the correct SpeechRecognition lang in the frontend
 *
 * Strategy (two-tier):
 * 1. franc (npm) — local, instant, free, no API call. Works for most inputs.
 *    If franc returns 'und' (undetermined, e.g. very short text), fall back to:
 * 2. Gemini — accurate for mixed-script or short queries
 *
 * WHY franc over a pure Gemini approach:
 * - Each Gemini call costs quota. Language detection would add a call to every query.
 * - franc handles Hindi, Tamil, Telugu, Bengali, Marathi, Kannada well for ≥10 words.
 * - Short queries (< 5 words) are genuinely ambiguous — Gemini helps here.
 */

const franc = require('franc');
const { detectLanguageWithGemini } = require('./gemini');
const logger = require('../utils/logger');

// Map franc's ISO 639-3 codes → our ISO 639-1 codes
// WHY: franc returns 3-letter codes ('hin' for Hindi), our system uses 2-letter ('hi')
const FRANC_TO_ISO2 = {
  hin: 'hi', // Hindi
  tam: 'ta', // Tamil
  tel: 'te', // Telugu
  ben: 'bn', // Bengali
  mar: 'mr', // Marathi
  kan: 'kn', // Kannada
  eng: 'en', // English
};

// Languages we support — anything else defaults to English
const SUPPORTED = new Set(['en', 'hi', 'ta', 'te', 'bn', 'mr', 'kn']);

/**
 * Detect the language of a text string.
 *
 * @param {string} text - The user's input text
 * @param {string|null} override - If user manually selected a language, use it
 * @returns {Promise<string>} ISO 639-1 language code
 */
async function detectLanguage(text, override = null) {
  // If the user explicitly chose a language in the UI, respect that
  if (override && SUPPORTED.has(override)) {
    return override;
  }

  // Very short text (< 5 chars) — franc is unreliable, default to English
  if (!text || text.trim().length < 5) {
    return 'en';
  }

  try {
    // franc.detect() returns the most likely ISO 639-3 code, or 'und' if uncertain
    const iso3 = franc(text);
    const iso2 = FRANC_TO_ISO2[iso3];

    if (iso2 && SUPPORTED.has(iso2)) {
      logger.debug(`Language detected by franc: ${iso3} → ${iso2}`);
      return iso2;
    }

    // franc returned 'und' or an unsupported language — try Gemini
    if (text.length >= 10) {
      logger.debug('franc undetermined, falling back to Gemini language detection');
      const geminiCode = await detectLanguageWithGemini(text);
      return SUPPORTED.has(geminiCode) ? geminiCode : 'en';
    }

    return 'en'; // Safe default
  } catch (err) {
    logger.warn('Language detection failed:', err.message);
    return 'en';
  }
}

module.exports = { detectLanguage };
