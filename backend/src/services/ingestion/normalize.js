/**
 * Standardizes curly quotes, apostrophes, and common typographic entities
 * into standard ASCII equivalents.
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeQuotesAndDashes(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '--');
}

/**
 * Repairs line-break hyphenation where a word was split across lines.
 * Example: "car-\navan" -> "caravan"
 *
 * @param {string} text
 * @returns {string}
 */
export function repairHyphenation(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/([a-zA-Z])-[\t ]*\r?\n[\t ]*([a-zA-Z])/g, '$1$2');
}

/**
 * Full source text normalizer for book ingestion.
 *
 * 1. Unifies line breaks (\r\n -> \n)
 * 2. Unifies curly quotes & dashes
 * 3. Repairs line-break hyphenation
 * 4. Removes standalone page numbers
 * 5. Reflows wrapped lines within paragraphs while preserving paragraph breaks (\n\n)
 *    and section header markers (## ...)
 *
 * @param {string} rawText
 * @returns {string}
 */
export function normalizeSourceText(rawText) {
  if (typeof rawText !== 'string') return '';

  // 1. Unify line endings
  let text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. Unify typographic quotes and dashes
  text = normalizeQuotesAndDashes(text);

  // 3. Repair line-break hyphenation
  text = repairHyphenation(text);

  // 4. Remove isolated page numbers on their own lines (e.g., "\n  42  \n")
  text = text.replace(/\n\s*\d+\s*\n/g, '\n\n');

  // 5. Split by double-or-more newlines to identify paragraphs / headers
  const rawParagraphs = text.split(/\n{2,}/);

  const cleanedParagraphs = [];
  for (const para of rawParagraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Preserve section markers exactly on their own line
    if (trimmed.startsWith('##')) {
      const headerLine = trimmed.split('\n')[0].trim();
      cleanedParagraphs.push(headerLine);
      const rest = trimmed.slice(headerLine.length).trim();
      if (rest) {
        cleanedParagraphs.push(rest.replace(/\s+/g, ' '));
      }
      continue;
    }

    // Unify single line breaks inside paragraphs into spaces
    const unwrapped = trimmed.replace(/\s+/g, ' ');
    cleanedParagraphs.push(unwrapped);
  }

  return cleanedParagraphs.join('\n\n');
}

/**
 * Canonical single normalization function for embeddings.
 * CRITICAL RULE: Ingestion and query paths must call this exact function before POST /embed.
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeForEmbedding(text) {
  if (typeof text !== 'string') return '';
  return normalizeQuotesAndDashes(text)
    .replace(/\s+/g, ' ')
    .trim();
}
