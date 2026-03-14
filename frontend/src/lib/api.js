/**
 * lib/api.js
 *
 * WHY: A centralised Axios instance that:
 * 1. Automatically adds the Authorization header to every request
 * 2. Handles 401 responses by redirecting to login (token expired)
 * 3. Provides a consistent base URL across dev and prod
 *
 * Components just call api.post('/query', data) — they never touch localStorage
 * or handle auth headers directly.
 */

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30 second timeout — Gemini can be slow on free tier
});

// Request interceptor: attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nyayabot_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear storage and redirect to login
      localStorage.removeItem('nyayabot_token');
      localStorage.removeItem('nyayabot_user');
      // Only redirect if we're not already on the login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
