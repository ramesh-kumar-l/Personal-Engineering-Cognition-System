import type { MemoryStore } from '../storage/MemoryStore';
import type { Memory } from '../storage/schema';

type SyncPayload = {
  memories: Memory[];
  exportedAt: string;
  version: string;
};

export class CloudSync {
  private readonly syncVersion = '1';

  constructor(private readonly memoryStore: MemoryStore) {}

  /**
   * PUT all memories as JSON to the configured URL.
   * Returns the count of memories exported.
   */
  async export(url: string, token?: string): Promise<number> {
    const memories = await this.memoryStore.getAllWorkspaces();
    const payload: SyncPayload = {
      memories,
      exportedAt: new Date().toISOString(),
      version: this.syncVersion,
    };

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Export failed with HTTP ${response.status}: ${await response.text()}`);
    }

    return memories.length;
  }

  /**
   * GET memories from the configured URL and import new ones (deduplication by id).
   * Returns the count of newly imported memories.
   */
  async import(url: string, token?: string): Promise<number> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Import failed with HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json() as unknown;
    if (!isValidPayload(data)) {
      throw new Error('Invalid sync payload: expected { memories: Memory[] }');
    }

    return this.memoryStore.importMemories(data.memories);
  }
}

function isValidPayload(data: unknown): data is SyncPayload {
  return (
    typeof data === 'object' &&
    data !== null &&
    'memories' in data &&
    Array.isArray((data as Record<string, unknown>)['memories'])
  );
}
