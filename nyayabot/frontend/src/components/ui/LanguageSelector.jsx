/**
 * components/ui/LanguageSelector.jsx
 *
 * Flag-based dropdown for selecting UI + response language.
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

export default function LanguageSelector() {
  const { currentLanguage, currentLangObj, languages, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2
                   bg-zinc-100 dark:bg-zinc-800
                   border border-zinc-200 dark:border-zinc-700
                   hover:border-gold-500 dark:hover:border-gold-500
                   rounded-lg px-3 py-2 text-sm
                   text-zinc-800 dark:text-zinc-200
                   transition-colors"
      >
        <span>{currentLangObj.flag}</span>
        <span className="hidden sm:inline">{currentLangObj.nativeName}</span>
        <ChevronDown
          className={`w-4 h-4 text-zinc-400 dark:text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48
                        bg-white dark:bg-zinc-900
                        border border-zinc-200 dark:border-zinc-700
                        rounded-xl shadow-xl z-50 overflow-hidden">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { setLanguage(lang.code); setIsOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors ${
                currentLanguage === lang.code
                  ? 'bg-gold-50 dark:bg-gold-500/15 text-gold-700 dark:text-gold-300'
                  : 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <div>
                <div className="font-medium">{lang.nativeName}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-500">{lang.name}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
