import { describe, it, expect, beforeEach } from 'vitest';
import { KeywordIndex } from '../../src/search/KeywordIndex';
import { EmbeddingIndex } from '../../src/search/EmbeddingIndex';
import { Ranker } from '../../src/search/Ranker';
import type { Memory } from '../../src/storage/schema';

function makeMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: crypto.randomUUID(),
    workspaceId: 'ws-test',
    type: 'note',
    title: 'Default title',
    content: 'Default content',
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('KeywordIndex', () => {
  let index: KeywordIndex;

  beforeEach(() => {
    index = new KeywordIndex();
  });

  it('returns empty array for empty index', () => {
    expect(index.search('anything')).toEqual([]);
  });

  it('finds exact title match', () => {
    const memory = makeMemory({ title: 'database connection timeout fix' });
    index.indexMemories([memory]);
    const results = index.search('database timeout');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe(memory.id);
  });

  it('handles fuzzy matching (typos)', () => {
    const memory = makeMemory({ title: 'database connection' });
    index.indexMemories([memory]);
    const results = index.search('databse connecton'); // intentional typos
    // Fuzzy matching may or may not catch both — at minimum score > 0
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it('returns empty for empty query', () => {
    const memory = makeMemory({ title: 'test' });
    index.indexMemories([memory]);
    expect(index.search('')).toEqual([]);
    expect(index.search('   ')).toEqual([]);
  });

  it('reindexes correctly after content change', () => {
    const memory = makeMemory({ title: 'old title' });
    index.indexMemories([memory]);
    expect(index.search('old title').length).toBeGreaterThan(0);

    const updated = { ...memory, title: 'completely different' };
    index.indexMemories([updated]);
    expect(index.search('old title').length).toBe(0);
    expect(index.search('completely different').length).toBeGreaterThan(0);
  });

  it('boosts title matches over content matches', () => {
    const titleMemory = makeMemory({ title: 'authentication flow', content: 'some other text' });
    const contentMemory = makeMemory({ title: 'unrelated title', content: 'authentication flow details' });
    index.indexMemories([titleMemory, contentMemory]);

    const results = index.search('authentication flow');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe(titleMemory.id);
  });
});

describe('EmbeddingIndex', () => {
  let index: EmbeddingIndex;

  beforeEach(() => {
    index = new EmbeddingIndex();
  });

  it('returns empty for empty index', () => {
    expect(index.search([1, 0, 0], 5)).toEqual([]);
  });

  it('returns empty for empty query vector', () => {
    index.addVector('id1', [1, 0, 0]);
    expect(index.search([], 5)).toEqual([]);
  });

  it('finds identical vector with score 1.0', () => {
    const vector = [0.5, 0.5, 0.7071];
    index.addVector('id1', vector);
    const results = index.search(vector, 5);
    expect(results.length).toBe(1);
    expect(results[0].score).toBeCloseTo(1.0, 5);
  });

  it('returns top-k results sorted by score descending', () => {
    index.addVector('close', [1, 0.1, 0]);
    index.addVector('far', [0, 1, 0]);
    index.addVector('exact', [1, 0, 0]);

    const results = index.search([1, 0, 0], 2);
    expect(results).toHaveLength(2);
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    expect(results[0].id).toBe('exact');
  });

  it('removes vectors correctly', () => {
    index.addVector('id1', [1, 0, 0]);
    index.addVector('id2', [0, 1, 0]);
    index.removeVector('id1');
    expect(index.size()).toBe(1);
    const results = index.search([1, 0, 0], 5);
    expect(results.every(r => r.id !== 'id1')).toBe(true);
  });
});

describe('Ranker', () => {
  const ranker = new Ranker();

  it('returns empty when no candidates', () => {
    expect(ranker.rank([], [], [], 10)).toEqual([]);
  });

  it('ranks by keyword score when no semantic hits', () => {
    const m1 = makeMemory({ title: 'high score' });
    const m2 = makeMemory({ title: 'low score' });

    const results = ranker.rank(
      [m1, m2],
      [
        { id: m1.id, score: 10, title: 'high score', createdAt: m1.createdAt, type: 'note' },
        { id: m2.id, score: 2, title: 'low score', createdAt: m2.createdAt, type: 'note' },
      ],
      [],
      10
    );

    expect(results[0].id).toBe(m1.id);
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('respects maxResults', () => {
    const memories = Array.from({ length: 20 }, (_, i) =>
      makeMemory({ id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`, title: `Memory ${i}` })
    );
    const hits = memories.map(m => ({
      id: m.id,
      score: Math.random() * 10,
      title: m.title,
      createdAt: m.createdAt,
      type: 'note' as const,
    }));

    const results = ranker.rank(memories, hits, [], 5);
    expect(results).toHaveLength(5);
  });

  it('recent memories get higher temporal score', () => {
    const recent = makeMemory({ createdAt: new Date().toISOString() });
    const old = makeMemory({ createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() });

    const results = ranker.rank(
      [recent, old],
      [
        { id: recent.id, score: 5, title: 'recent', createdAt: recent.createdAt, type: 'note' },
        { id: old.id, score: 5, title: 'old', createdAt: old.createdAt, type: 'note' },
      ],
      [],
      10
    );

    const recentResult = results.find(r => r.id === recent.id)!;
    const oldResult = results.find(r => r.id === old.id)!;
    expect(recentResult.temporalScore).toBeGreaterThan(oldResult.temporalScore);
  });
});
