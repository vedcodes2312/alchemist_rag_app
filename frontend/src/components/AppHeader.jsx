import React from 'react';
import {
  BookOpen,
  Sparkles,
  PanelLeft,
  Plus,
  Cpu,
} from 'lucide-react';

export function AppHeader({
  indexReady,
  onToggleSidebar,
  onNewChat,
  isSidebarOpen,
}) {
  return (
    <header className="sticky top-0 z-20 h-14 w-full shrink-0 border-b border-[#2A2E3D] bg-[#141722]/90 backdrop-blur-md">
      <div className="flex h-full w-full items-center justify-between px-3 sm:px-5">
        {/* Left: Sidebar Toggle & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg border border-[#2A2E3D] bg-[#1C202E] text-[#A6ADB8] hover:text-[#E5A93C] hover:border-[#E5A93C]/40 transition-colors cursor-pointer"
            title={isSidebarOpen ? 'Hide journal sidebar' : 'Open journal sidebar'}
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#262C3D] to-[#1C202E] text-[#E5A93C] shadow-xs border border-[#E5A93C]/25">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg font-bold tracking-wide text-[#F4E9D5]">
                  Alchemist AI
                </span>
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-sans font-medium px-1.5 py-0.5 rounded-full bg-[#E5A93C]/10 text-[#E5A93C] border border-[#E5A93C]/30">
                  <Cpu className="w-2.5 h-2.5" />
                  Gemini 3.8 Flash
                </span>
              </div>
              <span className="text-[11px] font-sans text-[#9CA3AF] -mt-1 hidden sm:inline">
                Reading Companion &middot; Paulo Coelho
              </span>
            </div>
          </div>
        </div>

        {/* Right: Book Grounded Pill & New Chat Quick Action */}
        <div className="flex items-center gap-2.5 text-xs font-sans">
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-[#2A2E3D] bg-[#1C202E] px-2.5 py-1 text-[#9CA3AF]">
            <span
              className={`w-2 h-2 rounded-full ${
                indexReady !== false
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34D399]'
                  : 'bg-amber-400'
              }`}
            />
            <BookOpen className="h-3.5 w-3.5 text-[#E5A93C]" />
            <span className="text-[11px] text-[#C5CCD8]">The Alchemist (303 Chunks)</span>
          </div>

          <button
            onClick={onNewChat}
            className="flex items-center gap-1.5 rounded-lg border border-[#E5A93C]/30 bg-[#E5A93C]/10 hover:bg-[#E5A93C]/20 px-2.5 py-1.5 text-xs font-medium text-[#F4E9D5] transition-all cursor-pointer"
            title="Start new discussion"
          >
            <Plus className="w-3.5 h-3.5 text-[#E5A93C]" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </div>
    </header>
  );
}
