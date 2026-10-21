import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function SourceCard({ source, index }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    chunkId,
    documentTitle,
    chapter,
    pageNumber,
    excerpt = '',
    similarity,
  } = source;

  const scoreFormatted =
    typeof similarity === 'number' ? similarity.toFixed(2) : null;

  return (
    <article className="on-parchment relative overflow-hidden rounded-xl bg-[#F4E9D5] text-[#352B24] shadow-[0_1px_2px_rgba(0,0,0,0.25),0_6px_18px_rgba(0,0,0,0.28)] transition-all duration-150">
      {/* Terracotta corner accent */}
      <div className="absolute top-0 left-0 h-1 w-12 bg-[#A85C43]" />

      <div className="p-4 sm:p-5">
        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-sans text-xs font-semibold tracking-wider uppercase text-[#6B6256]">
              Passage {index + 1}
            </span>
            {chapter && (
              <>
                <span className="text-xs text-[#6B6256]/50">&bull;</span>
                <span className="font-sans text-xs font-medium text-[#6B6256]">
                  {chapter}
                </span>
              </>
            )}
            {pageNumber && (
              <>
                <span className="text-xs text-[#6B6256]/50">&bull;</span>
                <span className="font-sans text-xs font-medium text-[#6B6256]">
                  p. {pageNumber}
                </span>
              </>
            )}
          </div>

          {scoreFormatted !== null && (
            <span
              title="Cosine similarity: a ranking signal, not a probability of correctness"
              className="cursor-help rounded-md border border-[#352B24]/15 bg-[#352B24]/5 px-2 py-0.5 font-sans text-[11px] font-semibold text-[#6B6256]"
            >
              Relevance {scoreFormatted}
            </span>
          )}
        </div>

        {/* Excerpt Text (Cormorant Garamond Serif) */}
        <div className="mb-3">
          <p
            className={`font-serif text-[17px] sm:text-[18px] leading-[1.65] text-[#352B24] ${
              !isExpanded ? 'line-clamp-2' : ''
            }`}
          >
            &ldquo;{excerpt}&rdquo;
          </p>
        </div>

        {/* Expand / Collapse Action */}
        <div className="flex items-center justify-between border-t border-[#352B24]/10 pt-2.5">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-controls={`passage-content-${chunkId || index}`}
            className="flex items-center gap-1 font-sans text-xs font-semibold text-[#A85C43] hover:text-[#352B24] transition-colors"
          >
            <span>{isExpanded ? 'Show less' : 'Show full passage'}</span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>

          {chunkId && (
            <span className="font-mono text-[11px] text-[#6B6256]/80 break-all">
              {chunkId}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
