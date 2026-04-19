/**
 * lib/i18n.js
 *
 * WHY i18next: The UI itself needs to be multilingual, not just the Gemini answers.
 * Button labels, error messages, disclaimers — all must be localised.
 *
 * For now we only have English strings. Hindi/Tamil/etc. translations will be added
 * as separate JSON files in public/locales/ directory. This setup is ready for them.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // App
      appName: 'NyayaBot',
      tagline: 'Legal Help in Your Language',
      disclaimer: 'This is not professional legal advice. Please consult a qualified lawyer for your specific situation.',

      // Auth
      login: 'Log In',
      register: 'Register',
      email: 'Email',
      password: 'Password',
      name: 'Full Name',
      loginTitle: 'Welcome back',
      registerTitle: 'Create an account',
      logout: 'Log Out',

      // Chat
      newChat: 'New Consultation',
      askLegal: 'Ask a legal question...',
      send: 'Send',
      thinking: 'Consulting legal sources...',
      noSessions: 'No previous consultations',
      sources: 'Sources',
      repealedWarning: '⚠️ This law has been repealed',
      recentlyAmended: 'Recently Amended',
      viewSource: 'View Source',

      // Languages
      selectLanguage: 'Select Language',
      languages: {
        en: '🇬🇧 English',
        hi: '🇮🇳 हिंदी',
        ta: 'தமிழ்',
        te: 'తెలుగు',
        bn: 'বাংলা',
        mr: 'मराठी',
        kn: 'ಕನ್ನಡ',
      },

      // Voice
      voiceInput: 'Voice Input',
      speakAnswer: 'Listen to Answer',
      stopSpeaking: 'Stop',
      voiceNotSupported: 'Voice input requires Chrome or Edge browser',
      listening: 'Listening...',

      // Law categories
      lawCategories: {
        all: 'All Laws',
        bns: 'BNS 2023',
        bnss: 'BNSS 2023',
        constitution: 'Constitution',
        rti: 'RTI Act',
        cpa: 'Consumer Protection',
      },

      // Errors
      errorGeneral: 'Something went wrong. Please try again.',
      errorNetwork: 'Network error. Please check your connection.',
      errorRateLimit: 'Too many queries. Please wait before asking again.',
      errorUnavailable: 'Service temporarily unavailable.',
    },
  },
  hi: {
    translation: {
      appName: 'न्यायबॉट',
      tagline: 'आपकी भाषा में कानूनी सहायता',
      disclaimer: 'यह पेशेवर कानूनी सलाह नहीं है। अपनी विशिष्ट स्थिति के लिए एक योग्य वकील से परामर्श करें।',
      newChat: 'नई परामर्श',
      askLegal: 'कानूनी प्रश्न पूछें...',
      send: 'भेजें',
      thinking: 'कानूनी स्रोतों से जाँच हो रही है...',
      sources: 'स्रोत',
      repealedWarning: '⚠️ यह कानून रद्द हो गया है',
      listening: 'सुन रहा हूँ...',
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('nyayabot_language') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React handles XSS escaping
    },
  });

export default i18n;
