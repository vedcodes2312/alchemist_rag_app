import React, { useEffect, useState } from 'react';
import { AppHeader } from './components/AppHeader.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { ChatLayout } from './components/ChatLayout.jsx';
import { useChat } from './hooks/useChat.js';
import { getBookInfo } from './services/chatApi.js';

export default function App() {
  const chat = useChat();
  const [indexInfo, setIndexInfo] = useState({ indexReady: true, chunkCount: 303 });

  useEffect(() => {
    const controller = new AbortController();
    getBookInfo(controller.signal)
      .then((info) => setIndexInfo(info))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return (
    <div className="h-screen bg-[#141722] text-[#F4E9D5] flex flex-col font-sans overflow-hidden">
      {/* Top Application Header */}
      <AppHeader
        indexReady={indexInfo.indexReady}
        onToggleSidebar={chat.toggleSidebar}
        onNewChat={chat.newChat}
        isSidebarOpen={chat.isSidebarOpen}
      />

      {/* Main App Body: Sidebar + Chat Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <Sidebar
          sessions={chat.sessions}
          activeSessionId={chat.sessionId}
          isOpen={chat.isSidebarOpen}
          onSelectSession={chat.loadSession}
          onNewChat={chat.newChat}
          onDeleteSession={chat.deleteSession}
          onClose={chat.toggleSidebar}
          chunkCount={indexInfo.chunkCount || 303}
        />

        {/* Chat Main Viewport */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden relative">
          <ChatLayout chat={chat} />
        </div>
      </div>
    </div>
  );
}
