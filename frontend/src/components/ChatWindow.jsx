import React, { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble.jsx';
import { LoadingIndicator } from './LoadingIndicator.jsx';
import { ErrorMessage } from './ErrorMessage.jsx';

export function ChatWindow({ messages = [], status, error, onRetry }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, status, error]);

  return (
    <div
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="Conversation"
      className="flex-1 space-y-2 py-4"
    >
      {/* Visually hidden screen reader notice */}
      <h1 className="sr-only">Alchemist AI Conversation</h1>

      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {status === 'loading' && <LoadingIndicator />}

      {error && <ErrorMessage error={error} onRetry={onRetry} />}

      <div ref={bottomRef} className="h-4" />
    </div>
  );
}
