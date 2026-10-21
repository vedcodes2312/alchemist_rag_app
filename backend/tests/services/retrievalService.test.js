import { describe, it, expect, vi } from 'vitest';
import { RetrievalService } from '../../src/services/retrievalService.js';
import * as supabaseClientModule from '../../src/config/supabaseClient.js';
import { embeddingClient } from '../../src/services/embeddingClient.js';

describe('RetrievalService', () => {
  it('retrieves candidates, applies threshold, and caps excerpt characters', async () => {
    vi.spyOn(embeddingClient, 'embed').mockResolvedValueOnce(new Array(384).fill(0.05));

    const mockRpc = vi.fn().mockResolvedValueOnce({
      data: [
        {
          id: 'chunk-1',
          chapter: 'Prologue',
          page_number: null,
          content: 'Relevant passage about the alchemist.',
          similarity: 0.65,
        },
        {
          id: 'chunk-2',
          chapter: 'Part One',
          page_number: null,
          content: 'X'.repeat(900), // Exceeds 800 chars
          similarity: 0.45,
        },
        {
          id: 'chunk-3',
          chapter: 'Part Two',
          page_number: null,
          content: 'Low similarity noise candidate.',
          similarity: 0.15, // Below 0.30 threshold!
        },
      ],
      error: null,
    });

    vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue({
      rpc: mockRpc,
    });

    const service = new RetrievalService({
      threshold: 0.30,
      maxExcerptChars: 800,
    });

    const results = await service.retrieveCandidates('Who is the alchemist?');

    // chunk-3 with 0.15 should be dropped because 0.15 < 0.30 threshold
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('chunk-1');
    expect(results[0].similarity).toBe(0.65);

    expect(results[1].id).toBe('chunk-2');
    expect(results[1].content.length).toBeLessThanOrEqual(803); // 800 chars + '...'
    expect(results[1].content.endsWith('...')).toBe(true);
  });

  it('returns an empty array when all candidates are below threshold', async () => {
    vi.spyOn(embeddingClient, 'embed').mockResolvedValueOnce(new Array(384).fill(0.01));

    vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue({
      rpc: vi.fn().mockResolvedValueOnce({
        data: [
          { id: 'c1', content: 'Noise', similarity: 0.12 },
          { id: 'c2', content: 'More noise', similarity: 0.20 },
        ],
        error: null,
      }),
    });

    const service = new RetrievalService({ threshold: 0.30 });
    const results = await service.retrieveCandidates('Completely unrelated topic');

    expect(results).toEqual([]);
  });
});
