/**
 * store/authStore.js
 *
 * WHY Zustand over Redux: Redux requires boilerplate (reducers, actions,
 * selectors). Zustand gives the same functionality in ~5 lines.
 * For our simple auth state (token + user), Zustand is perfect.
 *
 * Persists token and user to localStorage so sessions survive page refreshes.
 */

import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('nyayabot_user') || 'null'),
  token: localStorage.getItem('nyayabot_token') || null,
  isAuthenticated: !!localStorage.getItem('nyayabot_token'),

  // Called after successful login or register
  login: (user, token) => {
    localStorage.setItem('nyayabot_token', token);
    localStorage.setItem('nyayabot_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  // Clear everything on logout
  logout: () => {
    localStorage.removeItem('nyayabot_token');
    localStorage.removeItem('nyayabot_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  // Update user after preferences change
  updateUser: (updates) =>
    set((state) => {
      const updatedUser = { ...state.user, ...updates };
      localStorage.setItem('nyayabot_user', JSON.stringify(updatedUser));
      return { user: updatedUser };
    }),
}));

export default useAuthStore;
