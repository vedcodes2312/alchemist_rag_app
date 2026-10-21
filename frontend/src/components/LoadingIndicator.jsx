import React from 'react';
import { Sparkles } from 'lucide-react';

export function LoadingIndicator() {
  return (
    <div
      role="status"
      aria-label="Searching the book"
      className="flex items-start gap-3 py-4 animate-message-in"
    >
      {/* Assistant Avatar */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#22283A] text-[#C69B55] border border-[#D7B98E]/20">
        <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
      </div>

      <div className="flex flex-col gap-1.5 pt-0.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#C69B55] animate-dot-1" />
          <span className="h-2 w-2 rounded-full bg-[#C69B55] animate-dot-2" />
          <span className="h-2 w-2 rounded-full bg-[#C69B55] animate-dot-3" />
        </div>
        <span className="font-sans text-xs text-[#A39A8C] italic">
          Consulting the indexed text&hellip;
        </span>
      </div>
    </div>
  );
}
