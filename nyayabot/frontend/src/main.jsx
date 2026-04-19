/**
 * main.jsx — React application entry point
 *
 * WHY these providers at the root:
 * - QueryClientProvider: enables React Query throughout the app
 * - I18nextProvider: enables translations throughout the app
 * - BrowserRouter: enables React Router navigation
 * - Toaster: enables toast notifications from any component
 *
 * THEME INIT (before React renders):
 * We read the persisted theme from localStorage synchronously and apply
 * the 'dark' class to <html> BEFORE the first React paint. This prevents
 * a flash of the wrong theme (white flash on dark-preference users).
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import './lib/i18n'; // Initialise i18next before app renders
import App from './App';
import './index.css';

// ── Apply saved theme before first paint (prevents flash) ───────────────────
try {
  const saved = JSON.parse(localStorage.getItem('nyayabot-theme') || '{}');
  const theme = saved?.state?.theme ?? 'dark'; // Default: dark
  document.documentElement.classList.toggle('dark', theme !== 'light');
} catch {
  // If localStorage is unavailable or corrupt, default to dark
  document.documentElement.classList.add('dark');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Only retry failed queries once
      refetchOnWindowFocus: false, // Don't refetch when user switches tabs
    },
    mutations: {
      retry: 0, // Don't retry failed mutations (user should know immediately)
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1C1C1C',
              color: '#F0F0F0',
              border: '1px solid #3F3F46',
            },
            success: { iconTheme: { primary: '#C8961F', secondary: '#1C1C1C' } },
            error:   { iconTheme: { primary: '#EF4444', secondary: '#1C1C1C' } },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
