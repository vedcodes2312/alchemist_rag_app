import React, { useState } from 'react';
import { Sparkles, SearchX, ChevronDown, BookOpen } from 'lucide-react';
import { SourceCard } from './SourceCard.jsx';

export function MessageBubble({ message }) {
  const { role, variant = 'answer', content, interpretation, sources = [], warnings = [] } = message;
  const [showSources, setShowSources] = useState(false);

  // User Message
  if (role === 'user') {
    return (
      <div className="flex justify-end py-3 animate-message-in">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm border border-[#D7B98E]/35 bg-[#22283A] px-4 py-3 sm:px-5 sm:py-3.5 shadow-md">
          <p className="font-sans text-[15px] sm:text-base text-[#F4E9D5] leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        </div>
      </div>
    );
  }

  // Assistant Fallback (Insufficient Evidence)
  if (variant === 'fallback') {
    return (
      <div className="flex items-start gap-3 py-4 animate-message-in">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#22283A] text-[#D7B98E] border border-[#D7B98E]/25">
          <SearchX className="h-4 w-4" strokeWidth={1.75} />
        </div>

        <div className="flex-1 max-w-[68ch]">
          <div className="rounded-xl border border-[#A85C43]/40 bg-[#22283A]/50 p-4">
            <span className="font-sans text-[11px] font-semibold tracking-wider uppercase text-[#D7B98E] mb-1.5 block">
              Insufficient Book Evidence
            </span>
            <p className="font-sans text-[15px] sm:text-base text-[#F4E9D5] leading-relaxed mb-2.5 whitespace-pre-wrap">
              {content}
            </p>
            <p className="font-sans text-xs text-[#A39A8C] italic">
              Try asking about specific characters, events, themes, or symbols found within the book.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Assistant Standard Answer
  const paragraphs = (content || '').split('\n\n').filter(Boolean);
  const interpParagraphs = (interpretation || '').split('\n\n').filter(Boolean);

  return (
    <div className="flex items-start gap-3 py-4 animate-message-in">
      {/* Assistant Star Avatar */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#22283A] text-[#C69B55] border border-[#D7B98E]/25 shadow-sm">
        <Sparkles className="h-4 w-4" strokeWidth={1.75} />
      </div>

      <div className="flex-1 max-w-[68ch]">
        {/* "From the text" section */}
        <div className="mb-4">
          <span className="font-sans text-[11px] font-semibold tracking-wider uppercase text-[#D7B98E] mb-1.5 block">
            From The Text
          </span>
          <div className="space-y-3 font-sans text-[15px] sm:text-base text-[#F4E9D5] leading-relaxed">
            {paragraphs.map((para, i) => (
              <p key={i} className="whitespace-pre-line">
                {para}
              </p>
            ))}
          </div>
        </div>

        {/* "Interpretation" section (if present) */}
        {interpretation && (
          <div className="my-4 border-l-2 border-[#C69B55] pl-3.5 sm:pl-4">
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="font-sans text-[11px] font-semibold tracking-wider uppercase text-[#C69B55]">
                Interpretation
              </span>
              <span className="font-sans text-[11px] text-[#A39A8C] italic">
                (a reading, not stated in the text)
              </span>
            </div>
            <div className="space-y-2.5 font-sans text-[14px] sm:text-[15px] text-[#F4E9D5]/90 leading-relaxed">
              {interpParagraphs.map((para, i) => (
                <p key={i} className="whitespace-pre-line">
                  {para}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Unverified quotation warning */}
        {warnings.includes('UNVERIFIED_QUOTATION') && (
          <p className="my-2 font-sans text-xs text-[#A39A8C] italic">
            Note: Some quoted wording could not be verified against the retrieved passages.
          </p>
        )}

        {/* Source cards toggle and list */}
        {sources && sources.length > 0 && (
          <div className="mt-4 pt-2">
            <button
              type="button"
              onClick={() => setShowSources((prev) => !prev)}
              aria-expanded={showSources}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#D7B98E]/25 bg-[#22283A] px-3 py-1 font-sans text-xs font-semibold text-[#D7B98E] transition-all hover:border-[#C69B55] hover:text-[#C69B55] active:scale-[0.98]"
            >
              <BookOpen className="h-3.5 w-3.5 text-[#C69B55]" />
              <span>Sources ({sources.length})</span>
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-200 ${
                  showSources ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showSources && (
              <div className="mt-3 space-y-3 pt-2">
                <span className="font-sans text-[11px] font-semibold tracking-wider uppercase text-[#A39A8C] block mb-2">
                  Passages from the Book
                </span>
                {sources.map((src, idx) => (
                  <SourceCard key={src.chunkId || idx} source={src} index={idx} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
