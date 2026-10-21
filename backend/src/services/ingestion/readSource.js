import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Reads and validates a UTF-8 text source file from disk.
 *
 * @param {string} filePath - Absolute or relative path to the source file
 * @param {object} [options]
 * @param {number} [options.minLength=100] - Minimum acceptable character length
 * @returns {Promise<{ rawText: string, fileSize: number, filePath: string }>}
 */
export async function readSource(filePath, options = {}) {
  const minLength = options.minLength ?? 100;

  if (!filePath || typeof filePath !== 'string') {
    throw new Error('A valid file path string must be provided.');
  }

  const resolvedPath = path.resolve(process.cwd(), filePath);

  let stats;
  try {
    stats = await fs.stat(resolvedPath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Source file not found at: ${resolvedPath}`);
    }
    throw new Error(`Unable to access source file: ${err.message}`);
  }

  if (!stats.isFile()) {
    throw new Error(`Specified path is not a regular file: ${resolvedPath}`);
  }

  let rawText;
  try {
    rawText = await fs.readFile(resolvedPath, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to read source file as UTF-8: ${err.message}`);
  }

  if (rawText.length < minLength) {
    throw new Error(
      `Source file content is too short (${rawText.length} chars). Minimum required is ${minLength} characters.`
    );
  }

  return {
    rawText,
    fileSize: stats.size,
    filePath: resolvedPath,
  };
}
