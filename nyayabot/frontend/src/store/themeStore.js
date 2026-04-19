/**
 * store/themeStore.js
 *
 * Manages dark/light mode preference.
 * Persisted to localStorage so the user's choice survives page refreshes.
 *
 * WHY Zustand + persist: same pattern as authStore/chatStore already in use.
 * WHY classList.toggle on document.documentElement: Tailwind's darkMode:'class'
 *   reads the 'dark' class on <html> — toggling it here is the single source of truth.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark', // Default: dark mode always

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        // Apply immediately to <html> so Tailwind dark: classes update
        document.documentElement.classList.toggle('dark', next === 'dark');
        set({ theme: next });
      },

      // Programmatic setter (used by main.jsx on init)
      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        set({ theme });
      },
    }),
    {
      name: 'nyayabot-theme', // localStorage key
    }
  )
);

export default useThemeStore;
