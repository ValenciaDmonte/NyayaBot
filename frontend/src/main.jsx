/**
 * main.jsx — React application entry point
 *
 * WHY these providers at the root:
 * - QueryClientProvider: enables React Query throughout the app
 * - I18nextProvider: enables translations throughout the app
 * - BrowserRouter: enables React Router navigation
 * - Toaster: enables toast notifications from any component
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import './lib/i18n'; // Initialise i18next before app renders
import App from './App';
import './index.css';

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
              background: '#1A237E',
              color: '#F5F5F5',
              border: '1px solid #3949AB',
            },
            success: { iconTheme: { primary: '#FF9933', secondary: '#1A237E' } },
            error: { iconTheme: { primary: '#EF4444', secondary: '#1A237E' } },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
