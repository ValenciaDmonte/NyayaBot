/**
 * hooks/useLanguage.js
 *
 * WHY: Language selection affects:
 * 1. The UI labels (i18next)
 * 2. The languageOverride sent in API requests
 * 3. The SpeechRecognition lang property in useSpeech
 *
 * This hook centralises all three so changing the language in the dropdown
 * automatically updates everything.
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// Supported languages with display metadata
export const LANGUAGES = [
  { code: 'en', name: 'English',  flag: '🇬🇧', bcp47: 'en-IN', nativeName: 'English' },
  { code: 'hi', name: 'Hindi',    flag: '🇮🇳', bcp47: 'hi-IN', nativeName: 'हिंदी' },
  { code: 'ta', name: 'Tamil',    flag: '🌐',  bcp47: 'ta-IN', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu',   flag: '🌐',  bcp47: 'te-IN', nativeName: 'తెలుగు' },
  { code: 'bn', name: 'Bengali',  flag: '🌐',  bcp47: 'bn-IN', nativeName: 'বাংলা' },
  { code: 'mr', name: 'Marathi',  flag: '🌐',  bcp47: 'mr-IN', nativeName: 'मराठी' },
  { code: 'kn', name: 'Kannada',  flag: '🌐',  bcp47: 'kn-IN', nativeName: 'ಕನ್ನಡ' },
];

export const LANGUAGE_MAP = Object.fromEntries(LANGUAGES.map((l) => [l.code, l]));

export function useLanguage() {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguageState] = useState(
    localStorage.getItem('nyayabot_language') || 'en'
  );

  const setLanguage = useCallback((code) => {
    setCurrentLanguageState(code);
    localStorage.setItem('nyayabot_language', code);
    i18n.changeLanguage(code); // Update UI labels
  }, [i18n]);

  const currentLangObj = LANGUAGE_MAP[currentLanguage] || LANGUAGE_MAP.en;

  return {
    currentLanguage,
    setLanguage,
    currentLangObj,
    languages: LANGUAGES,
    // BCP-47 code for Web Speech API (e.g. 'hi-IN', 'ta-IN')
    bcp47: currentLangObj.bcp47,
  };
}
