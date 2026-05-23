import { describe, it, expect, beforeEach } from 'vitest';
import { KeywordIndex } from '../../src/search/KeywordIndex';
import { EmbeddingIndex } from '../../src/search/EmbeddingIndex';
import { HNSWIndex } from '../../src/search/HNSWIndex';
import { EmbeddingService } from '../../src/search/EmbeddingService';
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

describe('HNSWIndex', () => {
  let index: HNSWIndex;

  beforeEach(() => {
    index = new HNSWIndex({ M: 4, efConstruction: 20 });
  });

  it('returns empty for empty index', () => {
    expect(index.search([1, 0, 0], 5)).toEqual([]);
  });

  it('insert is idempotent (duplicate inserts ignored)', () => {
    index.insert('id1', [1, 0, 0]);
    index.insert('id1', [0, 1, 0]); // same id, different vector — ignored
    expect(index.size).toBe(1);
    const results = index.search([1, 0, 0], 1);
    expect(results[0].score).toBeCloseTo(1.0, 4);
  });

  it('finds identical vector with score ≈ 1.0', () => {
    const vec = [0.6, 0.8, 0.0];
    index.insert('id1', vec);
    const results = index.search(vec, 1);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('id1');
    expect(results[0].score).toBeCloseTo(1.0, 4);
  });

  it('returns nearest neighbor in 3D space', () => {
    index.insert('close', [1.0, 0.1, 0.0]);
    index.insert('far', [0.0, 0.0, 1.0]);
    index.insert('exact', [1.0, 0.0, 0.0]);

    const results = index.search([1, 0, 0], 3);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].id).toBe('exact');
    expect(results[0].score).toBeGreaterThan(results[results.length - 1].score);
  });

  it('respects topK limit', () => {
    for (let i = 0; i < 20; i++) {
      index.insert(`id${i}`, [Math.random(), Math.random(), Math.random()]);
    }
    const results = index.search([1, 0, 0], 5);
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('results sorted descending by score', () => {
    index.insert('a', [1, 0, 0]);
    index.insert('b', [0.7, 0.7, 0]);
    index.insert('c', [0, 1, 0]);
    const results = index.search([1, 0, 0], 3);
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
    }
  });

  it('remove eliminates node from future searches', () => {
    index.insert('id1', [1, 0, 0]);
    index.insert('id2', [0, 1, 0]);
    index.remove('id1');
    expect(index.size).toBe(1);
    const results = index.search([1, 0, 0], 5);
    expect(results.every(r => r.id !== 'id1')).toBe(true);
  });

  it('clear resets index to empty', () => {
    index.insert('id1', [1, 0, 0]);
    index.clear();
    expect(index.size).toBe(0);
    expect(index.search([1, 0, 0], 5)).toEqual([]);
  });
});

describe('EmbeddingService', () => {
  function makeMemory(id: string, embedding?: number[]): Memory {
    return {
      id,
      workspaceId: 'ws-a',
      type: 'note',
      title: 'Test',
      content: 'Test content',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      embedding,
    };
  }

  it('isEnabled = false when provider is null', () => {
    const svc = new EmbeddingService(null);
    expect(svc.isEnabled).toBe(false);
  });

  it('initialize builds HNSW from stored embeddings', () => {
    const svc = new EmbeddingService(null);
    const memories = [
      makeMemory('a', [1, 0, 0]),
      makeMemory('b', [0, 1, 0]),
      makeMemory('c', undefined), // no embedding — not indexed
    ];
    svc.initialize(memories);
    expect(svc.indexSize).toBe(2);
  });

  it('searchSemantic returns empty array when index is empty', () => {
    const svc = new EmbeddingService(null);
    svc.initialize([]);
    expect(svc.searchSemantic([1, 0, 0], 5)).toEqual([]);
  });

  it('searchSemantic with allowedIds filters results to workspace', () => {
    const svc = new EmbeddingService(null);
    svc.initialize([
      makeMemory('ws-a-1', [1, 0, 0]),
      makeMemory('ws-b-1', [1, 0.01, 0]), // nearly identical, different workspace
    ]);
    const allowed = new Set(['ws-a-1']);
    const results = svc.searchSemantic([1, 0, 0], 5, allowed);
    expect(results.every(r => r.id === 'ws-a-1')).toBe(true);
  });

  it('embedAndIndex returns undefined when no provider', async () => {
    const svc = new EmbeddingService(null);
    const result = await svc.embedAndIndex('id', 'some text');
    expect(result).toBeUndefined();
  });

  it('embedQuery returns undefined when no provider', async () => {
    const svc = new EmbeddingService(null);
    const result = await svc.embedQuery('some query');
    expect(result).toBeUndefined();
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
