import crypto from 'node:crypto';

/**
 * Calculates estimated tokens for a given text using the project formula:
 * ceil(words * 1.33)
 *
 * @param {string} text
 * @returns {number}
 */
export function estimateTokens(text) {
  if (typeof text !== 'string') return 0;
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  return Math.ceil(words.length * 1.33);
}

/**
 * Splits text into sentences cleanly.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function splitIntoSentences(text) {
  if (!text) return [];
  // Match period, exclamation, or question mark followed by whitespace
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.length > 0 ? sentences : [text.trim()];
}

/**
 * Chunks a collection of parsed sections into structured chunk objects.
 *
 * Rules:
 * - Chunks never cross section boundaries.
 * - Respects target tokens (e.g. 220) and overlap tokens (e.g. 40).
 * - Generates stable deterministic IDs: {slug}-{index:4}-{contentHash8}.
 *
 * @param {Array<{ chapter: string | null, chapterIndex: number | null, text: string, charStart: number, charEnd: number }>} sections
 * @param {object} [options]
 * @param {string} [options.slug='the-alchemist'] - Document slug
 * @param {number} [options.targetTokens=220] - Target tokens per chunk
 * @param {number} [options.overlapTokens=40] - Overlap tokens between consecutive chunks
 * @returns {Array<{ id: string, chunkIndex: number, chapter: string | null, chapterIndex: number | null, pageNumber: null, content: string, tokenEstimate: number, charStart: number, charEnd: number, metadata: object }>}
 */
export function chunkSections(sections, options = {}) {
  const slug = options.slug || 'the-alchemist';
  const targetTokens = options.targetTokens || 220;
  const overlapTokens = options.overlapTokens || 40;

  const allChunks = [];
  let globalChunkIndex = 0;

  for (const section of sections) {
    if (!section.text || !section.text.trim()) continue;

    const sectionChunks = chunkSingleSection(section, {
      slug,
      targetTokens,
      overlapTokens,
      startIndex: globalChunkIndex,
    });

    for (const chunk of sectionChunks) {
      allChunks.push(chunk);
      globalChunkIndex++;
    }
  }

  return allChunks;
}

/**
 * Chunks a single section without crossing section boundaries.
 */
function chunkSingleSection(section, { slug, targetTokens, overlapTokens, startIndex }) {
  const chunks = [];
  const rawParagraphs = section.text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  if (rawParagraphs.length === 0) return [];

  // Break paragraphs into units (split very long paragraphs into sentences)
  const units = [];
  for (const para of rawParagraphs) {
    const paraTokens = estimateTokens(para);
    if (paraTokens <= targetTokens) {
      units.push(para);
    } else {
      const sentences = splitIntoSentences(para);
      for (const sent of sentences) {
        const sentTokens = estimateTokens(sent);
        if (sentTokens <= targetTokens) {
          units.push(sent);
        } else {
          // Fallback for massive unbroken run-on sentences: split by words
          const words = sent.split(/\s+/).filter(Boolean);
          const maxWords = Math.floor(targetTokens / 1.33) || 50;
          for (let w = 0; w < words.length; w += maxWords) {
            units.push(words.slice(w, w + maxWords).join(' '));
          }
        }
      }
    }
  }

  let unitIndex = 0;
  let currentChunkIndex = startIndex;

  while (unitIndex < units.length) {
    const chunkUnits = [];
    let currentTokens = 0;
    let nextIndex = unitIndex;

    while (nextIndex < units.length) {
      const unit = units[nextIndex];
      const unitTokens = estimateTokens(unit);

      // If chunk already has content and adding this unit exceeds targetTokens, break
      if (chunkUnits.length > 0 && currentTokens + unitTokens > targetTokens) {
        break;
      }

      chunkUnits.push(unit);
      currentTokens += unitTokens;
      nextIndex++;
    }

    const chunkContent = chunkUnits.join('\n\n');
    const tokenEst = estimateTokens(chunkContent);

    // Compute deterministic ID: {slug}-{index:4}-{contentHash8}
    const hash8 = crypto.createHash('sha256').update(chunkContent).digest('hex').slice(0, 8);
    const id = `${slug}-${String(currentChunkIndex).padStart(4, '0')}-${hash8}`;

    // Offsets within section
    const sectionText = section.text;
    const charStartInSection = sectionText.indexOf(chunkUnits[0]);
    const charEndInSection = charStartInSection !== -1 ? charStartInSection + chunkContent.length : 0;
    const charStart = section.charStart + (charStartInSection !== -1 ? charStartInSection : 0);
    const charEnd = charStart + chunkContent.length;

    chunks.push({
      id,
      chunkIndex: currentChunkIndex,
      chapter: section.chapter,
      chapterIndex: section.chapterIndex,
      pageNumber: null,
      content: chunkContent,
      tokenEstimate: tokenEst,
      charStart,
      charEnd,
      metadata: {
        unitCount: chunkUnits.length,
      },
    });

    currentChunkIndex++;

    if (nextIndex >= units.length) {
      break;
    }

    // Calculate overlap: step backwards from nextIndex to find overlap units up to overlapTokens
    let overlapCount = 0;
    let accumulatedOverlapTokens = 0;

    for (let back = nextIndex - 1; back >= unitIndex; back--) {
      const backTokens = estimateTokens(units[back]);
      if (accumulatedOverlapTokens + backTokens <= overlapTokens || overlapCount === 0) {
        accumulatedOverlapTokens += backTokens;
        overlapCount++;
      } else {
        break;
      }
    }

    // Advance unitIndex: must always move forward by at least 1 unit beyond unitIndex to avoid infinite loops
    const candidateNextStart = nextIndex - overlapCount;
    unitIndex = Math.max(unitIndex + 1, candidateNextStart);
  }

  return chunks;
}
