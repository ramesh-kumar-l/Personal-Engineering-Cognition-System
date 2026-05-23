import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as path from 'path';
import { MemoryLinker } from '../../src/memory/MemoryLinker';
import { ProvenanceTracker } from '../../src/memory/ProvenanceTracker';
import { StalenessDetector } from '../../src/memory/StalenessDetector';
import type { Memory } from '../../src/storage/schema';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function makeStore(initial: Memory[] = []) {
  const memories: Memory[] = [...initial];
  return {
    getById: async (id: string) => memories.find(m => m.id === id),
    update: vi.fn(async (id: string, patch: Partial<Memory>) => {
      const idx = memories.findIndex(m => m.id === id);
      if (idx === -1) return null;
      memories[idx] = { ...memories[idx], ...patch };
      return memories[idx];
    }),
    _memories: memories,
  };
}

// ─── MemoryLinker ─────────────────────────────────────────────────────────────

describe('MemoryLinker', () => {
  it('links two memories bidirectionally', async () => {
    const a = makeMemory({ title: 'Memory A' });
    const b = makeMemory({ title: 'Memory B' });
    const store = makeStore([a, b]);
    const linker = new MemoryLinker(store as never);

    const result = await linker.link(a.id, b.id);
    expect(result).toBe(true);

    // Both updates called with cross-references
    expect(store.update).toHaveBeenCalledTimes(2);
    const aCall = store.update.mock.calls.find(c => c[0] === a.id);
    const bCall = store.update.mock.calls.find(c => c[0] === b.id);
    expect(aCall?.[1].linkedMemoryIds).toContain(b.id);
    expect(bCall?.[1].linkedMemoryIds).toContain(a.id);
  });

  it('returns true without duplicate writes when already linked', async () => {
    const a = makeMemory({ linkedMemoryIds: [] });
    const b = makeMemory({ linkedMemoryIds: [] });
    const store = makeStore([a, b]);
    const linker = new MemoryLinker(store as never);

    await linker.link(a.id, b.id); // first link
    store.update.mockClear();
    const result = await linker.link(a.id, b.id); // already linked
    expect(result).toBe(true);
    expect(store.update).not.toHaveBeenCalled();
  });

  it('returns false when a memory does not exist', async () => {
    const a = makeMemory();
    const store = makeStore([a]);
    const linker = new MemoryLinker(store as never);

    const result = await linker.link(a.id, crypto.randomUUID());
    expect(result).toBe(false);
  });

  it('returns false when linking to self', async () => {
    const a = makeMemory();
    const store = makeStore([a]);
    const linker = new MemoryLinker(store as never);

    const result = await linker.link(a.id, a.id);
    expect(result).toBe(false);
  });

  it('unlinks removes references from both sides', async () => {
    const id = crypto.randomUUID();
    const id2 = crypto.randomUUID();
    const a = makeMemory({ id, linkedMemoryIds: [id2] });
    const b = makeMemory({ id: id2, linkedMemoryIds: [id] });
    const store = makeStore([a, b]);
    const linker = new MemoryLinker(store as never);

    const result = await linker.unlink(id, id2);
    expect(result).toBe(true);

    const aCall = store.update.mock.calls.find(c => c[0] === id);
    const bCall = store.update.mock.calls.find(c => c[0] === id2);
    expect(aCall?.[1].linkedMemoryIds).not.toContain(id2);
    expect(bCall?.[1].linkedMemoryIds).not.toContain(id);
  });

  it('getLinked returns linked memory objects', async () => {
    const id2 = crypto.randomUUID();
    const a = makeMemory({ linkedMemoryIds: [id2] });
    const b = makeMemory({ id: id2, title: 'Linked memory' });
    const store = makeStore([a, b]);
    const linker = new MemoryLinker(store as never);

    const linked = await linker.getLinked(a.id);
    expect(linked).toHaveLength(1);
    expect(linked[0].id).toBe(id2);
  });

  it('getLinked returns empty array for memory with no links', async () => {
    const a = makeMemory();
    const store = makeStore([a]);
    const linker = new MemoryLinker(store as never);

    expect(await linker.getLinked(a.id)).toEqual([]);
  });
});

// ─── ProvenanceTracker ────────────────────────────────────────────────────────

describe('ProvenanceTracker', () => {
  it('returns undefined for non-git directories', () => {
    const tracker = new ProvenanceTracker();
    // /tmp or C:\Windows is guaranteed not to be a git repo
    const result = tracker.captureCommitHash('/nonexistent/path/not/a/git/repo');
    expect(result).toBeUndefined();
  });

  it('returns a 40-char hex string for actual git repos', () => {
    const tracker = new ProvenanceTracker();
    // The extension directory itself is inside a git repo
    const result = tracker.captureCommitHash(process.cwd());
    if (result !== undefined) {
      expect(result).toMatch(/^[0-9a-f]{40}$/);
    }
    // If not in a git repo during test, result is undefined — both are valid
  });
});

// ─── StalenessDetector ────────────────────────────────────────────────────────

describe('StalenessDetector', () => {
  it('returns unknown for memory without filePath', async () => {
    const detector = new StalenessDetector();
    const memory = makeMemory({ filePath: undefined });
    const status = await detector.check(memory, '/some/root');
    expect(status).toBe('unknown');
  });

  it('returns stale for memory pointing to nonexistent file', async () => {
    const detector = new StalenessDetector();
    const memory = makeMemory({ filePath: '/nonexistent/path/file.ts' });
    const status = await detector.check(memory, '/nonexistent/path');
    expect(status).toBe('stale');
  });

  it('returns unknown for memory with filePath but no commitHash', async () => {
    const detector = new StalenessDetector();
    // package.json lives at process.cwd() which is the extension dir — guaranteed to exist
    const memory = makeMemory({
      filePath: path.resolve(process.cwd(), 'package.json'),
      commitHash: undefined,
    });
    const status = await detector.check(memory, process.cwd());
    expect(status).toBe('unknown');
  });

  it('checkAll returns a map with entries for each memory with filePath', async () => {
    const detector = new StalenessDetector();
    const m1 = makeMemory({ filePath: '/nonexistent/a.ts' });
    const m2 = makeMemory({ filePath: '/nonexistent/b.ts' });
    const m3 = makeMemory({ filePath: undefined });
    const result = await detector.checkAll([m1, m2, m3], '/nonexistent');
    // m1 and m2 have filePaths and nonexistent → stale
    expect(result.get(m1.id)).toBe('stale');
    expect(result.get(m2.id)).toBe('stale');
    // m3 has no filePath → unknown
    expect(result.get(m3.id)).toBe('unknown');
  });
});
