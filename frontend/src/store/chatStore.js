/**
 * store/chatStore.js
 *
 * WHY: Chat state needs to be shared between Sidebar (sessions list),
 * ChatWindow (messages), and MessageInput (sending). Zustand makes this
 * clean without prop-drilling or Context boilerplate.
 */

import { create } from 'zustand';

const useChatStore = create((set, get) => ({
  // All sessions for the current user (populated by history API)
  sessions: [],

  // Currently open session ID
  activeSessionId: null,

  // Messages for the active session
  messages: [],

  // Is the sidebar open on mobile
  isSidebarOpen: false,

  // ── Session actions ──────────────────────────────────────────────────────

  setSessions: (sessions) => set({ sessions }),

  addSession: (session) =>
    set((state) => ({
      sessions: [session, ...state.sessions], // New session at top
    })),

  updateSession: (sessionId, updates) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s._id === sessionId ? { ...s, ...updates } : s
      ),
    })),

  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

  // ── Message actions ──────────────────────────────────────────────────────

  setMessages: (messages) => set({ messages }),

  // Add a message instantly (optimistic UI — shown before API confirms)
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  // Replace a temporary optimistic message with the real one from API
  replaceMessage: (tempId, realMessage) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === tempId ? realMessage : m
      ),
    })),

  // Remove a message (called when optimistic message fails)
  removeMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((m) => m._id !== messageId),
    })),

  // Clear messages when switching sessions
  clearMessages: () => set({ messages: [] }),

  // ── UI actions ───────────────────────────────────────────────────────────

  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  closeSidebar: () => set({ isSidebarOpen: false }),
}));

export default useChatStore;
