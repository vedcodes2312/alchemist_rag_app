import React from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  BookOpen,
  PanelLeftClose,
  Sparkles,
} from 'lucide-react';

export function Sidebar({
  sessions = [],
  activeSessionId,
  isOpen,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onClose,
  chunkCount = 303,
}) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-72 bg-[#12151E] border-r border-[#262B3B] flex flex-col transition-all duration-300 ease-in-out ${
          isOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:-ml-72'
        }`}
      >
        {/* Sidebar Header & New Chat Button */}
        <div className="p-4 border-b border-[#262B3B]/80 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E5A93C] shadow-[0_0_8px_#E5A93C]" />
              <span className="text-xs uppercase tracking-widest text-[#E5A93C] font-semibold">
                Journal
              </span>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-md text-[#8E95A5] hover:text-[#F4E9D5] hover:bg-[#1C212E] transition-colors"
              title="Close sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-[#E5A93C]/10 hover:bg-[#E5A93C]/20 border border-[#E5A93C]/40 hover:border-[#E5A93C] text-[#F4E9D5] text-sm font-medium transition-all shadow-xs group cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#E5A93C] group-hover:rotate-90 transition-transform duration-200" />
            <span>New Discussion</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-[#262B3B]">
          <div className="px-2 py-1 text-[11px] font-semibold tracking-wider uppercase text-[#6B7280]">
            Past Inquiries
          </div>

          {sessions.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-[#8E95A5]/70 space-y-2">
              <BookOpen className="w-6 h-6 mx-auto text-[#4B5563] opacity-60" />
              <p>No previous inquiries saved in database.</p>
              <p className="text-[11px] text-[#6B7280]">
                Ask any question to create your first thread.
              </p>
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <div
                  key={session.id}
                  className={`group relative flex items-center justify-between rounded-lg px-3 py-2.5 text-xs transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#1C2130] text-[#E5A93C] font-medium border border-[#E5A93C]/30 shadow-xs'
                      : 'text-[#C5CCD8] hover:bg-[#181C28] hover:text-[#F4E9D5]'
                  }`}
                  onClick={() => onSelectSession(session.id)}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-6">
                    <MessageSquare
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? 'text-[#E5A93C]' : 'text-[#6B7280] group-hover:text-[#9CA3AF]'
                      }`}
                    />
                    <span className="truncate leading-relaxed">{session.title}</span>
                  </div>

                  {/* Delete button (revealed on hover) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Delete this discussion thread?')) {
                        onDeleteSession(session.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 rounded-md transition-opacity"
                    title="Delete thread"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#262B3B]/80 text-[11px] text-[#8E95A5] flex items-center justify-between bg-[#0E1118]">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#E5A93C]" />
            <span>{chunkCount} Chunks Indexed</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1C212E] text-[#9CA3AF] border border-[#2E3547]">
            Postgres RLS
          </span>
        </div>
      </aside>
    </>
  );
}
