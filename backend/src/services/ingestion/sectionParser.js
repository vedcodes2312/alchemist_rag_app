/**
 * Parses normalized text into distinct sections based on markdown heading markers (## Title).
 * If no heading markers exist, returns the entire text as a single section with chapter: null.
 *
 * @param {string} text
 * @returns {Array<{ chapter: string | null, chapterIndex: number | null, text: string, charStart: number, charEnd: number }>}
 */
export function parseSections(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return [];
  }

  const markerRegex = /^##[ \t]+(.+)$/gm;
  const matches = [...text.matchAll(markerRegex)];

  if (matches.length === 0) {
    const trimmed = text.trim();
    return [
      {
        chapter: null,
        chapterIndex: null,
        text: trimmed,
        charStart: 0,
        charEnd: trimmed.length,
      },
    ];
  }

  const sections = [];
  let currentIndex = 0;

  // Check if there is text before the first section marker
  const firstMatch = matches[0];
  if (firstMatch.index > 0) {
    const preamble = text.slice(0, firstMatch.index).trim();
    if (preamble.length > 0) {
      sections.push({
        chapter: null,
        chapterIndex: currentIndex++,
        text: preamble,
        charStart: 0,
        charEnd: preamble.length,
      });
    }
  }

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const chapterTitle = match[1].trim();
    const sectionStartPos = match.index + match[0].length;
    const nextMatch = matches[i + 1];
    const sectionEndPos = nextMatch ? nextMatch.index : text.length;

    const rawSectionContent = text.slice(sectionStartPos, sectionEndPos);
    const trimmedContent = rawSectionContent.trim();

    if (trimmedContent.length > 0) {
      // Calculate start and end offsets relative to source text
      const contentOffsetInSlice = rawSectionContent.indexOf(trimmedContent);
      const actualStart = sectionStartPos + contentOffsetInSlice;
      const actualEnd = actualStart + trimmedContent.length;

      sections.push({
        chapter: chapterTitle,
        chapterIndex: currentIndex++,
        text: trimmedContent,
        charStart: actualStart,
        charEnd: actualEnd,
      });
    }
  }

  return sections;
}
