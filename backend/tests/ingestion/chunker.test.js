import { describe, it, expect } from 'vitest';
import { chunkSections, estimateTokens, splitIntoSentences } from '../../src/services/ingestion/chunker.js';

describe('chunker', () => {
  it('estimates tokens accurately via Math.ceil(words * 1.33)', () => {
    // 3 words: 3 * 1.33 = 3.99 -> 4
    expect(estimateTokens('one two three')).toBe(4);
    // 10 words: 10 * 1.33 = 13.3 -> 14
    expect(estimateTokens('a b c d e f g h i j')).toBe(14);
    expect(estimateTokens('')).toBe(0);
  });

  it('splits sentences on punctuation boundaries', () => {
    const text = 'First sentence. Second sentence! Is this the third? Yes.';
    const sentences = splitIntoSentences(text);
    expect(sentences).toHaveLength(4);
    expect(sentences[0]).toBe('First sentence.');
    expect(sentences[1]).toBe('Second sentence!');
    expect(sentences[2]).toBe('Is this the third?');
    expect(sentences[3]).toBe('Yes.');
  });

  it('never crosses section boundaries between chunks', () => {
    const sections = [
      {
        chapter: 'Section A',
        chapterIndex: 0,
        text: 'This is section A content. It has some text.',
        charStart: 0,
        charEnd: 44,
      },
      {
        chapter: 'Section B',
        chapterIndex: 1,
        text: 'This is section B content. It must not mix with A.',
        charStart: 50,
        charEnd: 100,
      },
    ];

    const chunks = chunkSections(sections, { slug: 'test-book', targetTokens: 100, overlapTokens: 20 });
    expect(chunks).toHaveLength(2);
    expect(chunks[0].chapter).toBe('Section A');
    expect(chunks[0].content).toContain('section A');
    expect(chunks[0].content).not.toContain('section B');

    expect(chunks[1].chapter).toBe('Section B');
    expect(chunks[1].content).toContain('section B');
    expect(chunks[1].content).not.toContain('section A');
  });

  it('produces deterministic and stable IDs for identical content', () => {
    const sections = [
      {
        chapter: 'Prologue',
        chapterIndex: 0,
        text: 'Santiago watched the sheep graze across the Andalusian plains.',
        charStart: 0,
        charEnd: 62,
      },
    ];

    const run1 = chunkSections(sections, { slug: 'alchemist', targetTokens: 100, overlapTokens: 20 });
    const run2 = chunkSections(sections, { slug: 'alchemist', targetTokens: 100, overlapTokens: 20 });

    expect(run1).toHaveLength(1);
    expect(run2).toHaveLength(1);
    expect(run1[0].id).toBe(run2[0].id);
    expect(run1[0].id).toMatch(/^alchemist-0000-[0-9a-f]{8}$/);
  });

  it('handles very long paragraphs by breaking into sentence-based chunks', () => {
    // Construct a long paragraph with multiple sentences
    const sentences = Array.from({ length: 25 }, (_, i) => `Sentence number ${i + 1} with descriptive words.`);
    const longParagraph = sentences.join(' ');

    const sections = [
      {
        chapter: 'Long Story',
        chapterIndex: 0,
        text: longParagraph,
        charStart: 0,
        charEnd: longParagraph.length,
      },
    ];

    const chunks = chunkSections(sections, { slug: 'test-long', targetTokens: 40, overlapTokens: 10 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.tokenEstimate).toBeGreaterThan(0);
      expect(chunk.id).toMatch(/^test-long-\d{4}-[0-9a-f]{8}$/);
    }
  });
});
