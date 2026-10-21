import React from 'react';
import { WelcomeScreen } from './WelcomeScreen.jsx';
import { ChatWindow } from './ChatWindow.jsx';
import { ChatInput } from './ChatInput.jsx';

export function ChatLayout({ chat }) {
  const { messages, status, error, send, retry } = chat;

  const hasStarted = messages.length > 0 || error !== null;

  return (
    <main className="relative flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-[#141722]">
      {/* Subtle Desert Dune Silhouette SVG Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-40 desert-sky overflow-hidden"
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

      {/* Scrollable Conversation Viewport (Only this area scrolls) */}
      <div className="relative z-[1] flex-1 min-h-0 overflow-y-auto px-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-[760px] min-h-full flex-col">
          {!hasStarted ? (
            <div className="my-auto py-6 sm:py-8">
              <WelcomeScreen onPick={send} disabled={status === 'loading'} />
            </div>
          ) : (
            <ChatWindow
              messages={messages}
              status={status}
              error={error}
              onRetry={retry}
            />
          )}
        </div>
      </div>

      {/* Fixed Composer Dock (Pinned at bottom, never scrolls out of view) */}
      <div className="relative z-[2] shrink-0 w-full border-t border-[#262B3B]/60 bg-[#141722]/90 backdrop-blur-md">
        <ChatInput onSend={send} disabled={status === 'loading'} />
      </div>
    </main>
  );
}
