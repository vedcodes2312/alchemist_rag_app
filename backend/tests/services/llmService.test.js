import { describe, it, expect } from 'vitest';
import { extractQuotes, verifyQuotes } from '../../src/services/llmService.js';

describe('llmService quotation verification', () => {
  it('extracts double-quoted spans of >= 4 words', () => {
    const text = 'The king stated, "Whoever you are, or whatever it is you do," while looking at the sheep. He also said "hello" and "good day".';
    const quotes = extractQuotes(text);

    expect(quotes).toHaveLength(1);
    expect(quotes[0]).toBe('Whoever you are, or whatever it is you do,');
  });

  it('ignores short quotes with fewer than 4 words', () => {
    const text = 'He sought the "Personal Legend" and "great treasure".';
    const quotes = extractQuotes(text);
    expect(quotes).toHaveLength(0);
  });

  it('verifies quotes that appear verbatim in candidate passages', () => {
    const candidates = [
      {
        content: 'The old man said, "Whoever you are, or whatever it is you do, when you really want something, it\'s because that desire originated in the soul of the universe."',
      },
    ];

    const quotes = ['Whoever you are, or whatever it is you do,'];
    expect(verifyQuotes(quotes, candidates)).toBe(true);
  });

  it('detects unverified or fabricated quotations', () => {
    const candidates = [
      {
        content: 'Santiago walked through the market of Tangier watching the crystal merchant.',
      },
    ];

    const fabricatedQuotes = ['Always listen to your heart and follow the butterflies'];
    expect(verifyQuotes(fabricatedQuotes, candidates)).toBe(false);
  });
});
