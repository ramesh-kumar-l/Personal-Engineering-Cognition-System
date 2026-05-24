import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { CloudSync } from '../../src/sync/CloudSync';
import { StorageManager } from '../../src/storage/StorageManager';
import { MemoryStore } from '../../src/storage/MemoryStore';

async function makeStore() {
  const tmpDir = path.join(os.tmpdir(), `pecs-sync-test-${uuidv4()}`);
  await fs.mkdir(tmpDir, { recursive: true });
  const storage = new StorageManager(tmpDir);
  await storage.load();
  return { store: new MemoryStore(storage), tmpDir };
}

describe('CloudSync.export', () => {
  let tmpDir: string;
  let store: MemoryStore;
  let sync: CloudSync;

  beforeEach(async () => {
    ({ store, tmpDir } = await makeStore());
    sync = new CloudSync(store);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('calls fetch with PUT and returns count of exported memories', async () => {
    await store.add({ workspaceId: 'ws', type: 'note', title: 'A', content: 'aaa', tags: [] });
    await store.add({ workspaceId: 'ws', type: 'note', title: 'B', content: 'bbb', tags: [] });

    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
    vi.stubGlobal('fetch', fetchSpy);
    const count = await sync.export('http://example.com/backup', 'mytoken');

    expect(count).toBe(2);
    expect(fetchSpy).toHaveBeenCalledWith('http://example.com/backup', expect.objectContaining({
      method: 'PUT',
      headers: expect.objectContaining({ 'Authorization': 'Bearer mytoken' }),
    }));
  });

  it('throws when remote returns non-ok status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, text: async () => 'Service Unavailable' }));
    await expect(sync.export('http://example.com/backup')).rejects.toThrow('503');
  });
});

describe('CloudSync.import', () => {
  let tmpDir: string;
  let store: MemoryStore;
  let sync: CloudSync;

  beforeEach(async () => {
    ({ store, tmpDir } = await makeStore());
    sync = new CloudSync(store);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('imports new memories and skips duplicates', async () => {
    const existing = await store.add({ workspaceId: 'ws', type: 'note', title: 'Existing', content: 'Already here', tags: [] });
    const newMemory = {
      id: uuidv4(), workspaceId: 'ws', type: 'note' as const, title: 'New one', content: 'From remote',
      tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ memories: [existing, newMemory], exportedAt: new Date().toISOString(), version: '1' }),
    }));

    const imported = await sync.import('http://example.com/backup');
    expect(imported).toBe(1); // only the truly new one
  });

  it('throws when remote returns non-ok status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'Unauthorized' }));
    await expect(sync.import('http://example.com/backup')).rejects.toThrow('401');
  });

  it('throws when response has invalid shape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ wrong: 'shape' }) }));
    await expect(sync.import('http://example.com/backup')).rejects.toThrow('Invalid sync payload');
  });
});
