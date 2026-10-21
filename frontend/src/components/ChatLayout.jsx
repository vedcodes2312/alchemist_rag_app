import React from 'react';
import { WelcomeScreen } from './WelcomeScreen.jsx';
import { ChatWindow } from './ChatWindow.jsx';
import { ChatInput } from './ChatInput.jsx';

export function ChatLayout({ chat }) {
  const { messages, status, error, send, retry } = chat;

  const hasStarted = messages.length > 0 || error !== null;

  return (
    <main className="relative flex min-h-[calc(100dvh-56px)] flex-col justify-between overflow-hidden">
      {/* Subtle Desert Dune Silhouette SVG Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-40 desert-sky"
      >
        <svg
          className="absolute bottom-0 left-0 w-full text-[#22283A]/30"
          viewBox="0 0 1440 320"
          fill="currentColor"
          preserveAspectRatio="none"
        >
          <path d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,170.7C960,160,1056,192,1152,192C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
        </svg>
      </div>

      {/* Main Conversation Column */}
      <div className="relative z-[1] mx-auto flex w-full max-w-[760px] flex-1 flex-col px-4 sm:px-6">
        {!hasStarted ? (
          <WelcomeScreen onPick={send} disabled={status === 'loading'} />
        ) : (
          <ChatWindow
            messages={messages}
            status={status}
            error={error}
            onRetry={retry}
          />
        )}
      </div>

      {/* Composer Input */}
      <ChatInput onSend={send} disabled={status === 'loading'} />
    </main>
  );
}
