import { describe, it, expect } from 'vitest';
import { AIProviderError } from '../../src/providers/AIProvider';
import { EmbeddingIndex } from '../../src/search/EmbeddingIndex';

describe('AIProviderError', () => {
  it('has correct name and properties', () => {
    const err = new AIProviderError('Bad auth', 'auth', 'claude');
    expect(err.name).toBe('AIProviderError');
    expect(err.message).toBe('Bad auth');
    expect(err.code).toBe('auth');
    expect(err.provider).toBe('claude');
    expect(err.retryable).toBe(false);
  });

  it('marks retryable errors correctly', () => {
    const err = new AIProviderError('Rate limit', 'rate_limit', 'claude', true);
    expect(err.retryable).toBe(true);
  });

  it('is instanceof Error', () => {
    const err = new AIProviderError('test', 'unknown', 'test');
    expect(err instanceof Error).toBe(true);
  });
});

describe('Provider interface contract (via EmbeddingIndex as proxy)', () => {
  it('cosine similarity returns 1.0 for identical vectors', () => {
    const idx = new EmbeddingIndex();
    const vec = [1, 0, 0];
    idx.addVector('test', vec);
    const results = idx.search(vec, 1);
    expect(results[0].score).toBeCloseTo(1.0);
  });

  it('cosine similarity returns 0 for orthogonal vectors', () => {
    const idx = new EmbeddingIndex();
    idx.addVector('a', [1, 0, 0]);
    const results = idx.search([0, 1, 0], 5);
    // Orthogonal vectors have cosine similarity of 0 — filtered out (score <= 0)
    expect(results.filter(r => r.id === 'a')).toHaveLength(0);
  });

  it('handles mismatched vector dimensions gracefully', () => {
    const idx = new EmbeddingIndex();
    idx.addVector('a', [1, 0, 0]);
    const results = idx.search([1, 0], 5); // different length
    expect(results).toEqual([]); // returns 0 for mismatched dimensions
  });
});
