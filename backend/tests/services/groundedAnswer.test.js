import { describe, it, expect } from 'vitest';
import {
  buildUserPrompt,
  GROUNDED_SYSTEM_INSTRUCTION,
  INSUFFICIENT_EVIDENCE_FALLBACK,
} from '../../src/prompts/groundedAnswer.js';

describe('groundedAnswer Prompt Builder', () => {
  it('formats question and evidence blocks with S1, S2 labels', () => {
    const question = 'What is the boy searching for?';
    const candidates = [
      {
        id: 'the-alchemist-0005-abcdef12',
        chapter: 'Part One',
        content: 'Santiago dreamed of finding treasure near the Pyramids.',
        similarity: 0.82,
      },
      {
        id: 'the-alchemist-0010-345678ab',
        chapter: 'Part Two',
        content: 'The boy traveled with the caravan across the Sahara.',
        similarity: 0.74,
      },
    ];

    const { promptText, labelMap } = buildUserPrompt(question, candidates);

    expect(promptText).toContain('<question>What is the boy searching for?</question>');
    expect(promptText).toContain('<passage label="S1">');
    expect(promptText).toContain('Santiago dreamed of finding treasure near the Pyramids.');
    expect(promptText).toContain('<passage label="S2">');
    expect(promptText).toContain('The boy traveled with the caravan across the Sahara.');

    // Critical anti-hallucination rule: Chunk IDs and chapter names must NOT be in the passage text
    expect(promptText).not.toContain('the-alchemist-0005-abcdef12');
    expect(promptText).not.toContain('Part One');

    expect(labelMap.get('S1')).toBe(candidates[0]);
    expect(labelMap.get('S2')).toBe(candidates[1]);
  });

  it('contains strict rules in system instruction', () => {
    expect(GROUNDED_SYSTEM_INSTRUCTION).toContain('ONLY the evidence blocks supplied');
    expect(GROUNDED_SYSTEM_INSTRUCTION).toContain('Never invent quotations');
    expect(GROUNDED_SYSTEM_INSTRUCTION).toContain('usedEvidence');
  });

  it('provides fixed fallback message', () => {
    expect(INSUFFICIENT_EVIDENCE_FALLBACK).toContain('I cannot find support for that in The Alchemist');
  });
});
