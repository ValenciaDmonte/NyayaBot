/**
 * components/layout/Header.jsx
 *
 * Top bar with: hamburger menu (mobile), app title, theme toggle,
 * language selector, user menu.
 */

import { Menu, LogOut, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import LanguageSelector from '../ui/LanguageSelector';
import useChatStore from '../../store/chatStore';
import useThemeStore from '../../store/themeStore';
import { useAuth } from '../../hooks/useAuth';

export default function Header() {
  const { user, logout }           = useAuth();
  const { toggleSidebar }          = useChatStore();
  const { theme, toggleTheme }     = useThemeStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const isDark = theme === 'dark';

  return (
    <header className="flex items-center justify-between px-4 py-3 z-10
                       border-b border-zinc-200 dark:border-zinc-800
                       bg-white dark:bg-zinc-950">

      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="lg:hidden text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-zinc-900 dark:text-white">न्यायबॉट / NyayaBot</h1>
      </div>

      {/* Right: language selector + theme toggle + user menu */}
      <div className="flex items-center gap-2">
        <LanguageSelector />

        {/* Dark/light toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400
                     hover:bg-zinc-100 dark:hover:bg-zinc-800
                     hover:text-zinc-900 dark:hover:text-white
                     transition-colors duration-200"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2
                       bg-zinc-100 dark:bg-zinc-800
                       hover:bg-zinc-200 dark:hover:bg-zinc-700
                       rounded-full px-3 py-2 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-gold-500 dark:bg-gold-500
                            flex items-center justify-center text-xs font-bold text-white">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="text-sm text-zinc-800 dark:text-white hidden sm:inline">
              {user?.name?.split(' ')[0]}
            </span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-44
                            bg-white dark:bg-zinc-900
                            border border-zinc-200 dark:border-zinc-700
                            rounded-xl shadow-xl z-50">
              <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{user?.name}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => { logout(); setShowUserMenu(false); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm
                           text-red-500 dark:text-red-400
                           hover:bg-zinc-50 dark:hover:bg-zinc-800
                           transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
