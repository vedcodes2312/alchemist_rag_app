import { useState, useCallback, useRef, useEffect } from 'react';
import {
  askQuestion,
  listChatSessions,
  getChatSession,
  deleteChatSession,
} from '../services/chatApi.js';

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading'
  const [error, setError] = useState(null);
  const [lastQuestion, setLastQuestion] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  const abortControllerRef = useRef(null);

  // Load past conversation sessions on initial mount
  const refreshSessions = useCallback(async () => {
    try {
      const list = await listChatSessions();
      setSessions(list);
    } catch (_err) {
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    refreshSessions();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [refreshSessions]);

  // Send a question in the current or new session
  const send = useCallback(
    async (question) => {
      const trimmed = (question || '').trim();
      if (!trimmed || trimmed.length > 500 || status === 'loading') {
        return;
      }

      setLastQuestion(trimmed);
      setError(null);

      // Append user message immediately for real-time responsiveness
      const userMsg = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        role: 'user',
        content: trimmed,
      };

      setMessages((prev) => [...prev, userMsg]);
      setStatus('loading');

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const data = await askQuestion(trimmed, sessionId, controller.signal);

        if (data.sessionId && data.sessionId !== sessionId) {
          setSessionId(data.sessionId);
        }

        let assistantMsg;
        if (data.status === 'answered') {
          assistantMsg = {
            id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + 1),
            role: 'assistant',
            variant: 'answer',
            question: trimmed,
            content: data.answer,
            interpretation: data.interpretation || null,
            sources: data.sources || [],
            warnings: data.meta?.warnings || [],
          };
        } else {
          assistantMsg = {
            id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + 1),
            role: 'assistant',
            variant: 'fallback',
            question: trimmed,
            content:
              data.answer ||
              'I cannot find support for that in The Alchemist. I can only answer questions directly supported by the text.',
            sources: [],
          };
        }

        setMessages((prev) => [...prev, assistantMsg]);
        setStatus('idle');

        // Refresh sessions list to update recent titles and timestamps
        refreshSessions();
      } catch (err) {
        if (err.name === 'AbortError') return;

        setError({
          code: err.code || 'REQUEST_FAILED',
          message: err.message || 'Failed to get an answer.',
          requestId: err.requestId || null,
        });
        setStatus('idle');
      }
    },
    [status, sessionId, refreshSessions]
  );

  // Start a fresh conversation
  const newChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setSessionId(null);
    setLastQuestion('');
    setError(null);
    setStatus('idle');
  }, []);

  // Switch to an existing past conversation
  const loadSession = useCallback(async (targetSessionId) => {
    if (!targetSessionId) return;
    setIsLoadingSession(true);
    setError(null);

    try {
      const sessionData = await getChatSession(targetSessionId);
      if (sessionData && sessionData.messages) {
        setSessionId(targetSessionId);
        setMessages(
          sessionData.messages.map((m) => ({
            id: m.id,
            role: m.role,
            variant: m.status === 'answered' ? 'answer' : 'fallback',
            content: m.content,
            interpretation: m.interpretation || null,
            sources: m.sources || [],
          }))
        );
      }
    } catch (_err) {
      setError({
        code: 'LOAD_SESSION_ERROR',
        message: 'Could not load previous conversation.',
      });
    } finally {
      setIsLoadingSession(false);
    }
  }, []);

  // Delete a conversation thread
  const deleteSession = useCallback(
    async (targetSessionId) => {
      if (!targetSessionId) return;
      await deleteChatSession(targetSessionId);
      if (targetSessionId === sessionId) {
        newChat();
      }
      refreshSessions();
    },
    [sessionId, newChat, refreshSessions]
  );

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const retry = useCallback(() => {
    if (lastQuestion) {
      send(lastQuestion);
    }
  }, [lastQuestion, send]);

  return {
    messages,
    status,
    error,
    send,
    retry,
    lastQuestion,
    sessionId,
    sessions,
    isSidebarOpen,
    isLoadingSession,
    newChat,
    loadSession,
    deleteSession,
    toggleSidebar,
    refreshSessions,
  };
}
