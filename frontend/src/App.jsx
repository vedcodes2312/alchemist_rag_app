import React, { useEffect, useState } from 'react';
import { AppHeader } from './components/AppHeader.jsx';
import { ChatLayout } from './components/ChatLayout.jsx';
import { useChat } from './hooks/useChat.js';
import { getBookInfo } from './services/chatApi.js';

export default function App() {
  const chat = useChat();
  const [indexInfo, setIndexInfo] = useState({ indexReady: false, chunkCount: 0 });

  useEffect(() => {
    const controller = new AbortController();
    getBookInfo(controller.signal)
      .then((info) => setIndexInfo(info))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen bg-[#171A24] text-[#F4E9D5] flex flex-col font-sans">
      <AppHeader indexReady={indexInfo.indexReady} />
      <ChatLayout chat={chat} />
    </div>
  );
}
