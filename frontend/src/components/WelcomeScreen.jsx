import React from 'react';
import { Sparkles } from 'lucide-react';
import { SuggestedQuestions } from './SuggestedQuestions.jsx';

export function WelcomeScreen({ onPick, disabled }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 sm:py-10 text-center animate-message-in">
      {/* Glyph with subtle glow */}
      <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#22283A] text-[#C69B55] border border-[#D7B98E]/25 shadow-[0_0_24px_rgba(198,155,85,0.22)]">
        <Sparkles className="h-7 w-7" strokeWidth={1.5} />
      </div>

      {/* Literary Display Heading */}
      <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[#F4E9D5] mb-2.5">
        Explore <span className="italic font-normal">The Alchemist</span>
      </h1>

      {/* Subtitle explaining book-grounded retrieval */}
      <p className="max-w-[560px] font-sans text-sm sm:text-base text-[#A39A8C] leading-relaxed mb-8 px-2">
        Ask about characters, events, symbols, and ideas. Every response is strictly
        grounded in book passages with visible evidence citations.
      </p>

      {/* Suggestions Container */}
      <div className="w-full max-w-[680px] mb-8 text-left">
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="text-xs font-sans font-semibold tracking-wider uppercase text-[#D7B98E]">
            Suggested Inquiries
          </span>
          <div className="h-px flex-1 bg-[#D7B98E]/15" />
        </div>
        <SuggestedQuestions onPick={onPick} disabled={disabled} />
      </div>

      {/* Honesty policy note */}
      <p className="font-sans text-xs text-[#8A8175] italic max-w-[480px]">
        &ldquo;Answers are grounded in indexed book passages. If the book doesn&rsquo;t say, neither will I.&rdquo;
      </p>
    </div>
  );
}
