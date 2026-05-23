import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryStore } from '../../src/storage/MemoryStore';
import { SummaryCache } from '../../src/storage/SummaryCache';
import { emptyDatabase, type Database } from '../../src/storage/schema';
import type { StorageManager } from '../../src/storage/StorageManager';

function makeStorage(initial?: Partial<Database>): StorageManager {
  const db: Database = { ...emptyDatabase(), ...initial };
  return {
    get: vi.fn().mockResolvedValue(db),
    scheduleFlush: vi.fn(),
    load: vi.fn().mockResolvedValue(db),
    flush: vi.fn().mockResolvedValue(undefined),
    flushImmediate: vi.fn().mockResolvedValue(undefined),
  } as unknown as StorageManager;
}

describe('MemoryStore', () => {
  const workspaceId = 'test-ws-123';

  it('adds a memory with generated id and timestamps', async () => {
    const storage = makeStorage();
    const store = new MemoryStore(storage);

    const memory = await store.add({
      workspaceId,
      type: 'debug',
      title: 'Test memory',
      content: 'Some content',
      tags: ['ts'],
    });

    expect(memory.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(memory.title).toBe('Test memory');
    expect(memory.workspaceId).toBe(workspaceId);
    expect(memory.createdAt).toBeTruthy();
    expect(storage.scheduleFlush).toHaveBeenCalled();
  });

  it('getAll filters by workspaceId', async () => {
    const storage = makeStorage({
      memories: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          workspaceId: 'ws-a',
          type: 'note',
          title: 'A note',
          content: 'content',
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          workspaceId: 'ws-b',
          type: 'note',
          title: 'Another note',
          content: 'content',
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    const store = new MemoryStore(storage);
    const results = await store.getAll('ws-a');
    expect(results).toHaveLength(1);
    expect(results[0].workspaceId).toBe('ws-a');
  });

  it('deletes a memory by id', async () => {
    const id = '11111111-1111-1111-1111-111111111111';
    const storage = makeStorage({
      memories: [{
        id,
        workspaceId,
        type: 'note',
        title: 'To delete',
        content: 'x',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }],
    });

    const store = new MemoryStore(storage);
    const deleted = await store.delete(id);
    expect(deleted).toBe(true);

    const db = await storage.get();
    expect(db.memories).toHaveLength(0);
  });

  it('returns false when deleting nonexistent id', async () => {
    const storage = makeStorage();
    const store = new MemoryStore(storage);
    const deleted = await store.delete('00000000-0000-0000-0000-000000000000');
    expect(deleted).toBe(false);
  });

  it('updates a memory and bumps updatedAt', async () => {
    const id = '11111111-1111-1111-1111-111111111111';
    const originalUpdatedAt = '2026-01-01T00:00:00.000Z';
    const storage = makeStorage({
      memories: [{
        id,
        workspaceId,
        type: 'note',
        title: 'Original',
        content: 'x',
        tags: [],
        createdAt: originalUpdatedAt,
        updatedAt: originalUpdatedAt,
      }],
    });

    const store = new MemoryStore(storage);
    const updated = await store.update(id, { title: 'Updated' });
    expect(updated?.title).toBe('Updated');
    expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
  });
});

describe('SummaryCache', () => {
  it('returns null for missing workspace', async () => {
    const storage = makeStorage();
    const cache = new SummaryCache(storage);
    const result = await cache.get('no-such-workspace');
    expect(result).toBeNull();
  });

  it('returns cached summary within TTL', async () => {
    const workspaceId = 'ws-test';
    const summary = {
      workspaceId,
      generatedAt: new Date().toISOString(),
      architecture: 'A TypeScript monorepo',
      keyModules: [],
      dependencies: {},
      techStack: ['TypeScript'],
      fileCount: 42,
      tokenCount: 1000,
      model: 'claude-sonnet-4-5',
    };

    const storage = makeStorage({ summaries: { [workspaceId]: summary } });
    const cache = new SummaryCache(storage);
    const result = await cache.get(workspaceId);
    expect(result).not.toBeNull();
    expect(result?.architecture).toBe('A TypeScript monorepo');
  });

  it('returns null for expired cache (> 24h old)', async () => {
    const workspaceId = 'ws-old';
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const storage = makeStorage({
      summaries: {
        [workspaceId]: {
          workspaceId,
          generatedAt: oldDate,
          architecture: 'Old summary',
          keyModules: [],
          dependencies: {},
          techStack: [],
          fileCount: 0,
          tokenCount: 0,
          model: 'test',
        },
      },
    });

    const cache = new SummaryCache(storage);
    const result = await cache.get(workspaceId);
    expect(result).toBeNull();
  });
});
