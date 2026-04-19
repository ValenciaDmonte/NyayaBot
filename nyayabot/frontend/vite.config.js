import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // WHY path alias: import '@/components/...' instead of '../../../components/...'
    // Prevents relative path hell in deeply nested components
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Proxy API calls to backend during development
    // WHY: avoids CORS issues in dev — browser sees same origin
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
