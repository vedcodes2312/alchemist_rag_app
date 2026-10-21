import React, { useState } from 'react';
import {
  Sparkles,
  SearchX,
  ChevronDown,
  BookOpen,
  Copy,
  Check,
  User,
  Quote,
} from 'lucide-react';
import { SourceCard } from './SourceCard.jsx';

/**
 * Formats text by highlighting verbatim double-quoted passages.
 */
function FormattedParagraph({ text }) {
  if (!text) return null;
  const parts = text.split(/(["“][^"”]+["”])/g);

  return (
    <p className="whitespace-pre-line leading-relaxed text-[#F4E9D5]">
      {parts.map((part, idx) => {
        if (/^["“][^"”]+["”]/.test(part)) {
          return (
            <span
              key={idx}
              className="inline-block px-1.5 py-0.5 mx-0.5 rounded-sm bg-[#E5A93C]/12 border border-[#E5A93C]/35 text-[#FDF8EE] font-serif italic font-medium shadow-2xs"
            >
              {part}
            </span>
          );
        }
        return part;
      })}
    </p>
  );
}

export function MessageBubble({ message }) {
  const {
    role,
    variant = 'answer',
    content,
    interpretation,
    sources = [],
    warnings = [],
  } = message;

  const [showSources, setShowSources] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const fullText = [
        content,
        interpretation ? `\n\nInterpretation:\n${interpretation}` : '',
      ]
        .join('')
        .trim();
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_err) {}
  };

  // User Message
  if (role === 'user') {
    return (
      <div className="flex justify-end py-3 animate-message-in">
        <div className="flex items-start gap-2.5 max-w-[85%] sm:max-w-[75%]">
          <div className="rounded-2xl rounded-tr-xs border border-[#E5A93C]/30 bg-[#22283A] px-4 py-3 sm:px-5 sm:py-3.5 shadow-md text-left">
            <p className="font-sans text-[15px] sm:text-base text-[#F4E9D5] leading-relaxed whitespace-pre-wrap">
              {content}
            </p>
          </div>
          <div className="w-7 h-7 rounded-full bg-[#1C202E] border border-[#2E3547] flex items-center justify-center text-[#E5A93C] shrink-0 mt-0.5 shadow-xs">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  // Assistant Fallback (Insufficient Evidence)
  if (variant === 'fallback') {
    return (
      <div className="flex items-start gap-3 py-4 animate-message-in">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#22283A] text-[#E0907A] border border-[#E0907A]/30 shadow-xs">
          <SearchX className="h-4 w-4" />
        </div>

        <div className="flex-1 max-w-[68ch]">
          <div className="rounded-xl border border-[#A85C43]/40 bg-[#1D212E]/75 p-4 sm:p-5 shadow-xs backdrop-blur-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#E0907A]" />
              <span className="font-sans text-[11px] font-semibold tracking-wider uppercase text-[#E0907A]">
                Insufficient Book Evidence
              </span>
            </div>
            <p className="font-sans text-[15px] sm:text-base text-[#F4E9D5] leading-relaxed mb-3 whitespace-pre-wrap">
              {content}
            </p>
            <div className="pt-2 border-t border-[#A85C43]/20 flex items-center gap-1.5 text-xs text-[#A39A8C]">
              <Quote className="w-3.5 h-3.5 text-[#E5A93C] shrink-0" />
              <span>
                Try asking about Santiago, the Alchemist, the King of Salem, omens, or the Personal Legend.
              </span>
            </div>
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
      {/* Assistant Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#262C3D] to-[#1C202E] text-[#E5A93C] border border-[#E5A93C]/30 shadow-xs mt-0.5">
        <Sparkles className="h-4 w-4" />
      </div>

      <div className="flex-1 max-w-[68ch]">
        {/* Main "From the text" section */}
        <div className="rounded-xl border border-[#2A2E3D] bg-[#1A1E2B]/60 p-4 sm:p-5 shadow-xs backdrop-blur-xs">
          <div className="flex items-center justify-between mb-3 border-b border-[#2A2E3D]/70 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E5A93C] shadow-[0_0_6px_#E5A93C]" />
              <span className="font-sans text-[11px] font-bold tracking-widest uppercase text-[#E5A93C]">
                From The Text
              </span>
            </div>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-[11px] text-[#A6ADB8] hover:text-[#E5A93C] px-2 py-1 rounded-md hover:bg-[#22283A] transition-colors cursor-pointer"
              title="Copy answer to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-3 font-sans text-[15px] sm:text-base leading-relaxed">
            {paragraphs.map((para, i) => (
              <FormattedParagraph key={i} text={para} />
            ))}
          </div>

          {/* "Interpretation" Callout Box (if present) */}
          {interpretation && (
            <div className="mt-4 pt-3.5 border-t border-[#2A2E3D]/80">
              <div className="rounded-lg border border-[#A78BFA]/30 bg-[#9D4EDD]/10 p-3.5 sm:p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#C084FC]" />
                  <span className="font-sans text-[11px] font-bold tracking-wider uppercase text-[#C084FC]">
                    Literary Interpretation
                  </span>
                  <span className="font-sans text-[10px] text-[#A6ADB8] italic ml-auto hidden sm:inline">
                    (philosophical reading)
                  </span>
                </div>
                <div className="space-y-2 font-sans text-[14px] sm:text-[15px] text-[#F4E9D5]/90 leading-relaxed">
                  {interpParagraphs.map((para, i) => (
                    <p key={i} className="whitespace-pre-line">
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Unverified quotation warning */}
          {warnings.includes('UNVERIFIED_QUOTATION') && (
            <p className="mt-2 text-xs text-amber-400/80 italic">
              Note: Some quoted phrasing could not be matched verbatim in retrieved excerpts.
            </p>
          )}

          {/* Sources Shelf Toggle */}
          {sources && sources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[#2A2E3D]/70">
              <button
                type="button"
                onClick={() => setShowSources((prev) => !prev)}
                aria-expanded={showSources}
                className="inline-flex items-center gap-2 rounded-lg border border-[#E5A93C]/30 bg-[#1C202E] hover:bg-[#22283A] px-3 py-1.5 font-sans text-xs font-semibold text-[#F4E9D5] transition-all cursor-pointer shadow-2xs hover:border-[#E5A93C]"
              >
                <BookOpen className="h-3.5 w-3.5 text-[#E5A93C]" />
                <span>Consulted Passages ({sources.length})</span>
                <ChevronDown
                  className={`h-3 w-3 text-[#A6ADB8] transition-transform duration-200 ${
                    showSources ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showSources && (
                <div className="mt-3.5 space-y-3 pt-1">
                  {sources.map((src, idx) => (
                    <SourceCard key={src.chunkId || idx} source={src} index={idx} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
