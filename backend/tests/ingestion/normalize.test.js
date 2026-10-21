import { describe, it, expect } from 'vitest';
import {
  normalizeSourceText,
  normalizeForEmbedding,
  repairHyphenation,
  normalizeQuotesAndDashes,
} from '../../src/services/ingestion/normalize.js';

describe('normalize', () => {
  it('repairs line-break hyphenation', () => {
    const broken = 'The trav-\neler crossed the des-\nert.';
    expect(repairHyphenation(broken)).toBe('The traveler crossed the desert.');
  });

  it('normalizes curly quotes, apostrophes, and em dashes', () => {
    const typographic = '“Santiago’s journey,” said the king—softly.';
    expect(normalizeQuotesAndDashes(typographic)).toBe('"Santiago\'s journey," said the king--softly.');
  });

  it('normalizes source text by removing standalone page numbers and unwrapping wrapped lines', () => {
    const raw = `## Chapter One\r\n\r\nThis is a line that was\r\nwrapped by the printer.\r\n\r\n  42  \r\n\r\nThis is the next paragraph.`;
    const normalized = normalizeSourceText(raw);

    expect(normalized).toContain('## Chapter One');
    expect(normalized).toContain('This is a line that was wrapped by the printer.');
    expect(normalized).not.toContain('42');
    expect(normalized).toContain('This is the next paragraph.');
  });

  it('normalizeForEmbedding standardizes quotes and collapses whitespace', () => {
    const queryA = '  Who   is   “Melchizedek”?  ';
    const queryB = 'Who is "Melchizedek"?';

    expect(normalizeForEmbedding(queryA)).toBe(normalizeForEmbedding(queryB));
    expect(normalizeForEmbedding(queryA)).toBe('Who is "Melchizedek"?');
  });

  it('handles empty or non-string input safely', () => {
    expect(normalizeSourceText('')).toBe('');
    expect(normalizeSourceText(null)).toBe('');
    expect(normalizeForEmbedding('')).toBe('');
    expect(normalizeForEmbedding(undefined)).toBe('');
  });
});
