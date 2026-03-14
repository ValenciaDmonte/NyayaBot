/**
 * components/layout/Header.jsx
 *
 * Top bar with: hamburger menu (mobile), app title, language selector, user menu.
 */

import { Menu, LogOut, User } from 'lucide-react';
import { useState } from 'react';
import LanguageSelector from '../ui/LanguageSelector';
import useChatStore from '../../store/chatStore';
import { useAuth } from '../../hooks/useAuth';

export default function Header() {
  const { user, logout } = useAuth();
  const { toggleSidebar } = useChatStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-navy-700 bg-navy-900 z-10">
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="lg:hidden text-navy-300 hover:text-white p-1"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-white">न्यायबॉट / NyayaBot</h1>
      </div>

      {/* Right: language selector + user menu */}
      <div className="flex items-center gap-3">
        <LanguageSelector />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 bg-navy-800 hover:bg-navy-700 rounded-full px-3 py-2 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-saffron-600 flex items-center justify-center text-xs font-bold text-white">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="text-sm text-white hidden sm:inline">{user?.name?.split(' ')[0]}</span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-44 bg-navy-800 border border-navy-600 rounded-xl shadow-xl z-50">
              <div className="px-4 py-3 border-b border-navy-700">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-navy-300 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => { logout(); setShowUserMenu(false); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-navy-700 transition-colors"
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
