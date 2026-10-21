import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export const SUGGESTED_QUESTIONS = [
  {
    group: 'Character',
    text: 'Who is Melchizedek and what advice does he give Santiago?',
  },
  {
    group: 'Character',
    text: "What role does the crystal merchant play in Santiago's journey?",
  },
  {
    group: 'Theme',
    text: "What does the book mean by a 'Personal Legend'?",
  },
  {
    group: 'Theme',
    text: "How does fear of failure affect the characters' choices?",
  },
  {
    group: 'Symbol',
    text: 'What do omens represent in the story?',
  },
  {
    group: 'Symbol',
    text: 'What does the desert symbolize?',
  },
];

export function SuggestedQuestions({ onPick, disabled = false }) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {SUGGESTED_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onPick(q.text)}
            className="group relative flex flex-col justify-between rounded-xl border border-[#D7B98E]/20 bg-[#22283A]/60 p-3.5 text-left transition-all duration-150 hover:border-[#C69B55]/60 hover:bg-[#F4E9D5]/[0.05] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <div className="flex items-center justify-between w-full mb-1.5">
              <span className="text-[11px] font-sans font-semibold tracking-wider uppercase text-[#D7B98E]">
                {q.group}
              </span>
              <ArrowUpRight
                className="h-3.5 w-3.5 text-[#A39A8C] transition-colors duration-150 group-hover:text-[#C69B55]"
                strokeWidth={1.75}
              />
            </div>
            <p className="font-sans text-sm text-[#F4E9D5] leading-snug">
              {q.text}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
