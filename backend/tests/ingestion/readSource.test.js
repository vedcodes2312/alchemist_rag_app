import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { readSource } from '../../src/services/ingestion/readSource.js';

describe('readSource', () => {
  const fixturePath = path.resolve(__dirname, '../fixtures/sample-source.txt');

  it('successfully reads an existing fixture file', async () => {
    const result = await readSource(fixturePath, { minLength: 50 });
    expect(result).toHaveProperty('rawText');
    expect(result).toHaveProperty('fileSize');
    expect(result).toHaveProperty('filePath');
    expect(result.rawText).toContain('The Golden Sands');
    expect(result.fileSize).toBeGreaterThan(0);
  });

  it('throws a descriptive error when file does not exist', async () => {
    const nonexistentPath = path.resolve(__dirname, '../fixtures/does-not-exist.txt');
    await expect(readSource(nonexistentPath)).rejects.toThrow('Source file not found at:');
  });

  it('throws an error when file is below minimum length requirement', async () => {
    await expect(readSource(fixturePath, { minLength: 100000 })).rejects.toThrow(
      'Source file content is too short'
    );
  });

  it('throws an error when invalid path string is provided', async () => {
    await expect(readSource('')).rejects.toThrow('A valid file path string must be provided');
  });
});
