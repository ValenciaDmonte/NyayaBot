/**
 * components/ui/LanguageSelector.jsx
 *
 * WHY: Users must be able to select their language for both UI and Gemini responses.
 * Flag-based dropdown is more scannable than a plain text list.
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

export default function LanguageSelector() {
  const { currentLanguage, currentLangObj, languages, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-navy-800 border border-navy-600 hover:border-saffron-600 rounded-lg px-3 py-2 text-sm text-white transition-colors"
      >
        <span>{currentLangObj.flag}</span>
        <span className="hidden sm:inline">{currentLangObj.nativeName}</span>
        <ChevronDown className={`w-4 h-4 text-navy-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-navy-800 border border-navy-600 rounded-xl shadow-xl z-50 overflow-hidden">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-navy-700 transition-colors ${
                currentLanguage === lang.code ? 'bg-saffron-600/20 text-saffron-400' : 'text-white'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <div>
                <div className="font-medium">{lang.nativeName}</div>
                <div className="text-xs text-navy-300">{lang.name}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
