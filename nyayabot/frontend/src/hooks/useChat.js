/**
 * hooks/useChat.js
 *
 * WHY: This is the central data-flow coordinator for the chat UI.
 * It connects:
 * - Zustand chatStore (state)
 * - React Query mutation (API call)
 * - Optimistic UI (instant user message before API responds)
 * - Toast notifications (errors)
 *
 * Components just call sendMessage(text) and read messages[] —
 * they never touch the API or store directly.
 */

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import useChatStore from '../store/chatStore';

export function useChat(currentLanguage) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const {
    messages,
    activeSessionId,
    sessions,
    addMessage,
    removeMessage,
    replaceMessage,
    setMessages,
    setSessions,
    setActiveSession,
    addSession,
    updateSession,
  } = useChatStore();

  // ── Load session history ─────────────────────────────────────────────────
  useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const response = await api.get('/history/sessions');
      setSessions(response.data.sessions);
      return response.data.sessions;
    },
    staleTime: 1000 * 60, // Re-fetch after 1 minute
  });

  // ── Load messages for active session ─────────────────────────────────────
  useQuery({
    queryKey: ['messages', activeSessionId],
    queryFn: async () => {
      if (!activeSessionId) return [];
      const response = await api.get(`/history/sessions/${activeSessionId}`);
      setMessages(response.data.messages);
      return response.data.messages;
    },
    enabled: !!activeSessionId,
  });

  // ── Send query mutation ───────────────────────────────────────────────────
  const queryMutation = useMutation({
    mutationFn: (payload) => api.post('/query', payload),
  });

  // ── Notice upload mutation ────────────────────────────────────────────────
  const noticeMutation = useMutation({
    mutationFn: (formData) =>
      api.post('/legal-notice/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
  });

  /**
   * Send a legal query through the RAG pipeline.
   * Uses optimistic UI: user message appears instantly,
   * then the assistant message appears after Gemini responds.
   */
  const sendMessage = useCallback(
    async (queryText) => {
      if (!queryText.trim() || queryMutation.isPending) return;

      // Create a temporary ID for the optimistic user message
      const tempUserId = `temp_user_${Date.now()}`;
      const tempAssistantId = `temp_assistant_${Date.now()}`;

      // Optimistically add user message immediately
      addMessage({
        _id: tempUserId,
        role: 'user',
        content: queryText,
        createdAt: new Date().toISOString(),
        isOptimistic: true,
      });

      // Add typing indicator placeholder
      addMessage({
        _id: tempAssistantId,
        role: 'assistant',
        content: '',
        isTyping: true,
        createdAt: new Date().toISOString(),
      });

      try {
        const response = await queryMutation.mutateAsync({
          query: queryText,
          sessionId: activeSessionId || undefined,
          languageOverride: currentLanguage !== 'en' ? currentLanguage : undefined,
        });

        const { answer, sessionId, messageId, citations, hasRepealedWarning, detectedLanguage, usedNoticeContext } =
          response.data;

        // If this was a new session, navigate to it and add to sidebar
        if (!activeSessionId) {
          setActiveSession(sessionId);
          navigate(`/chat/${sessionId}`, { replace: true });
          // The session will be fetched by the sessions query on next render
          queryClient.invalidateQueries({ queryKey: ['sessions'] });
        } else {
          // Update session's lastMessageAt in the sidebar
          updateSession(activeSessionId, { lastMessageAt: new Date().toISOString() });
        }

        // Replace in-place to preserve user→bot order in the array
        replaceMessage(tempUserId, {
          _id: `msg_user_${Date.now()}`,
          role: 'user',
          content: queryText,
          detectedLanguage,
          createdAt: new Date().toISOString(),
        });
        replaceMessage(tempAssistantId, {
          _id: messageId,
          role: 'assistant',
          content: answer,
          detectedLanguage,
          ragMetadata: { citations },
          hasRepealedWarning,
          usedNoticeContext: usedNoticeContext || false,
          createdAt: new Date().toISOString(),
        });
      } catch (error) {
        // Remove both optimistic messages on failure
        removeMessage(tempUserId);
        removeMessage(tempAssistantId);

        const errorMsg =
          error.response?.data?.error ||
          'Failed to get a response. Please try again.';

        if (error.response?.status === 429) {
          toast.error('Query limit reached. Please wait before asking again.');
        } else if (error.response?.status === 503) {
          toast.error('Service temporarily unavailable. Please try again in a moment.');
        } else {
          toast.error(errorMsg);
        }
      }
    },
    [
      queryMutation,
      activeSessionId,
      currentLanguage,
      addMessage,
      removeMessage,
      replaceMessage,
      setActiveSession,
      updateSession,
      navigate,
      queryClient,
    ]
  );

  // ── Upload + analyse a legal notice ──────────────────────────────────────
  const sendNotice = useCallback(
    async (file) => {
      if (noticeMutation.isPending) return;

      const tempUserId      = `temp_user_${Date.now()}`;
      const tempAssistantId = `temp_assistant_${Date.now()}`;

      // Optimistic user message shows the filename
      addMessage({
        _id: tempUserId,
        role: 'user',
        content: `📄 ${file.name} — Please explain this legal notice.`,
        createdAt: new Date().toISOString(),
        isOptimistic: true,
      });
      addMessage({
        _id: tempAssistantId,
        role: 'assistant',
        content: '',
        isTyping: true,
        createdAt: new Date().toISOString(),
      });

      try {
        const formData = new FormData();
        formData.append('notice', file);
        if (activeSessionId) formData.append('sessionId', activeSessionId);
        if (currentLanguage !== 'en') formData.append('languageOverride', currentLanguage);

        const response = await noticeMutation.mutateAsync(formData);
        const { answer, sessionId, messageId, detectedLanguage, isNoticeAnalysis, legitimacyCheck } = response.data;

        if (!activeSessionId) {
          setActiveSession(sessionId);
          navigate(`/chat/${sessionId}`, { replace: true });
          queryClient.invalidateQueries({ queryKey: ['sessions'] });
        } else {
          updateSession(activeSessionId, { lastMessageAt: new Date().toISOString() });
        }

        replaceMessage(tempUserId, {
          _id: `msg_user_${Date.now()}`,
          role: 'user',
          content: `📄 ${file.name} — Please explain this legal notice.`,
          detectedLanguage,
          createdAt: new Date().toISOString(),
        });
        replaceMessage(tempAssistantId, {
          _id: messageId,
          role: 'assistant',
          content: answer,
          detectedLanguage,
          isNoticeAnalysis,
          ragMetadata: {
            citations: [],
            legitimacyCheck: legitimacyCheck || null,
          },
          hasRepealedWarning: false,
          createdAt: new Date().toISOString(),
        });
      } catch (error) {
        removeMessage(tempUserId);
        removeMessage(tempAssistantId);

        if (error.response?.status === 429) {
          toast.error('Notice upload limit reached. Please wait before uploading again.');
        } else if (error.response?.status === 413) {
          toast.error('File too large. Maximum size is 5 MB.');
        } else if (error.response?.status === 422) {
          toast.error('Could not read text from the file. Please upload a clearer image or PDF.');
        } else {
          toast.error(error.response?.data?.error || 'Failed to analyse the notice. Please try again.');
        }
      }
    },
    [
      noticeMutation,
      activeSessionId,
      currentLanguage,
      addMessage,
      removeMessage,
      replaceMessage,
      setActiveSession,
      updateSession,
      navigate,
      queryClient,
    ]
  );

  // ── Start a new chat session ──────────────────────────────────────────────
  const startNewChat = useCallback(() => {
    setActiveSession(null);
    useChatStore.getState().clearMessages();
    navigate('/chat');
  }, [setActiveSession, navigate]);

  return {
    messages,
    sessions,
    activeSessionId,
    isLoading: queryMutation.isPending || noticeMutation.isPending,
    sendMessage,
    sendNotice,
    startNewChat,
  };
}
