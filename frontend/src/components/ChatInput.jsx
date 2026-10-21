import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal } from 'lucide-react';

export function ChatInput({ onSend, disabled = false, maxLength = 500 }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  // Auto-grow textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [text]);

  const trimmed = text.trim();
  const canSubmit = !disabled && trimmed.length > 0 && text.length <= maxLength;

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!canSubmit) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const charsLeft = maxLength - text.length;
  const showCounter = charsLeft <= 50;

  return (
    <div className="sticky bottom-0 z-10 w-full bg-gradient-to-t from-[#171A24] via-[#171A24]/95 to-transparent pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-[760px] px-4 sm:px-6">
        <form
          onSubmit={handleSubmit}
          className="relative flex items-end gap-2 rounded-2xl border border-[#D7B98E]/30 bg-[#22283A] p-2 sm:p-2.5 shadow-[0_-8px_24px_rgba(23,26,36,0.85)] transition-all focus-within:border-[#C69B55]/70"
        >
          <label htmlFor="chat-textarea" className="sr-only">
            Ask a question about The Alchemist
          </label>

          <textarea
            id="chat-textarea"
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about Santiago, the desert, omens..."
            maxLength={maxLength + 10}
            className="flex-1 max-h-[140px] resize-none border-0 bg-transparent px-3 py-2 font-sans text-sm sm:text-base text-[#F4E9D5] placeholder-[#A39A8C] focus:outline-none focus:ring-0"
          />

          {/* Character counter (only when close to limit) */}
          {showCounter && (
            <span
              className={`pb-2.5 font-mono text-[11px] ${
                charsLeft < 0 ? 'text-[#E0907A] font-bold' : 'text-[#A39A8C]'
              }`}
            >
              {charsLeft}
            </span>
          )}

          {/* Send Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            aria-label="Send question"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#C69B55] text-[#171A24] transition-all hover:bg-[#E3BB78] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SendHorizontal className="h-5 w-5" strokeWidth={2} />
          </button>
        </form>

        {/* Input instructions / disclaimer */}
        <div className="mt-2 flex items-center justify-between px-2 text-[11px] font-sans text-[#A39A8C]">
          <span className="hidden sm:inline">
            Enter to send &middot; Shift+Enter for a new line
          </span>
          <span className="text-[10px] sm:text-[11px] italic text-[#8A8175] text-right ml-auto">
            Grounded strictly in book text
          </span>
        </div>
      </div>
    </div>
  );
}
