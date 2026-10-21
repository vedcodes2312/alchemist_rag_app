import React from 'react';
import { BookOpen, Sparkles } from 'lucide-react';

export function AppHeader({ indexReady }) {
  return (
    <header className="sticky top-0 z-10 h-14 w-full border-b border-[#D7B98E]/15 bg-[#171A24]/85 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-[760px] items-center justify-between px-4 sm:px-6">
        {/* Brand Treatment */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#22283A] text-[#C69B55] shadow-sm border border-[#D7B98E]/20">
            <Sparkles className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-xl font-semibold tracking-wide text-[#F4E9D5]">
              Alchemist AI
            </span>
            <span className="text-[11px] font-sans font-medium text-[#A39A8C] -mt-1 hidden sm:inline">
              Reading Companion &middot; The Alchemist
            </span>
          </div>
        </div>

        {/* Status / Scope Tag */}
        <div className="flex items-center gap-2 text-xs font-sans text-[#A39A8C]">
          <span className="flex items-center gap-1.5 rounded-full border border-[#D7B98E]/20 bg-[#22283A]/70 px-2.5 py-1">
            <BookOpen className="h-3.5 w-3.5 text-[#C69B55]" strokeWidth={1.75} />
            <span className="hidden sm:inline">Book Grounded</span>
            <span className="sm:hidden">Grounded</span>
          </span>
        </div>
      </div>
    </header>
  );
}
