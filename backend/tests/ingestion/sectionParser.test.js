import { describe, it, expect } from 'vitest';
import { parseSections } from '../../src/services/ingestion/sectionParser.js';

describe('sectionParser', () => {
  it('parses text containing markdown ## markers', () => {
    const text = `## The Golden Sands\n\nFirst story text.\n\n## The Mountain of Glass\n\nSecond story text.`;
    const sections = parseSections(text);

    expect(sections).toHaveLength(2);
    expect(sections[0].chapter).toBe('The Golden Sands');
    expect(sections[0].chapterIndex).toBe(0);
    expect(sections[0].text).toBe('First story text.');

    expect(sections[1].chapter).toBe('The Mountain of Glass');
    expect(sections[1].chapterIndex).toBe(1);
    expect(sections[1].text).toBe('Second story text.');
  });

  it('handles preamble text appearing before the first ## marker', () => {
    const text = `Introductory notes.\n\n## Prologue\n\nPrologue text.`;
    const sections = parseSections(text);

    expect(sections).toHaveLength(2);
    expect(sections[0].chapter).toBeNull();
    expect(sections[0].chapterIndex).toBe(0);
    expect(sections[0].text).toBe('Introductory notes.');

    expect(sections[1].chapter).toBe('Prologue');
    expect(sections[1].chapterIndex).toBe(1);
    expect(sections[1].text).toBe('Prologue text.');
  });

  it('sets chapter to null without inventing titles when no markers exist', () => {
    const text = 'Just a continuous narrative without any section markers.';
    const sections = parseSections(text);

    expect(sections).toHaveLength(1);
    expect(sections[0].chapter).toBeNull();
    expect(sections[0].chapterIndex).toBeNull();
    expect(sections[0].text).toBe(text);
  });

  it('returns empty array for empty or whitespace-only input', () => {
    expect(parseSections('')).toEqual([]);
    expect(parseSections('   \n  \t ')).toEqual([]);
  });
});
