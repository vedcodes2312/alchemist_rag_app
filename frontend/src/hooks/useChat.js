import { useState, useCallback, useRef, useEffect } from 'react';
import { askQuestion } from '../services/chatApi.js';

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading'
  const [error, setError] = useState(null); // null | { code, message, requestId }
  const [lastQuestion, setLastQuestion] = useState('');

  const abortControllerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const send = useCallback(
    async (question) => {
      const trimmed = (question || '').trim();
      if (!trimmed || trimmed.length > 500 || status === 'loading') {
        return;
      }

      setLastQuestion(trimmed);
      setError(null);

      // Append user message immediately
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
        const data = await askQuestion(trimmed, controller.signal);

        let assistantMsg;
        if (data.status === 'answered') {
          assistantMsg = {
            id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + 1),
            role: 'assistant',
            variant: 'answer',
            content: data.answer,
            interpretation: data.interpretation || null,
            sources: data.sources || [],
            warnings: data.meta?.warnings || [],
          };
        } else {
          // insufficient_evidence or fallback
          assistantMsg = {
            id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + 1),
            role: 'assistant',
            variant: 'fallback',
            content:
              data.answer ||
              'I could not find sufficient evidence in the indexed passages to answer this question.',
            sources: [],
          };
        }

        setMessages((prev) => [...prev, assistantMsg]);
        setStatus('idle');
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
    [status]
  );

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
  };
}
