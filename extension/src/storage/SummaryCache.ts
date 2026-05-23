import type { RepoSummary } from './schema';
import type { StorageManager } from './StorageManager';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class SummaryCache {
  constructor(private readonly storage: StorageManager) {}

  async get(workspaceId: string): Promise<RepoSummary | null> {
    const db = await this.storage.get();
    const summary = db.summaries[workspaceId];
    if (!summary) return null;

    const age = Date.now() - new Date(summary.generatedAt).getTime();
    if (age > CACHE_TTL_MS) return null;

    return summary;
  }

  async set(workspaceId: string, summary: RepoSummary): Promise<void> {
    const db = await this.storage.get();
    db.summaries[workspaceId] = summary;
    this.storage.scheduleFlush();
  }

  async clear(workspaceId?: string): Promise<void> {
    const db = await this.storage.get();
    if (workspaceId) {
      delete db.summaries[workspaceId];
    } else {
      db.summaries = {};
    }
    this.storage.scheduleFlush();
  }
}
