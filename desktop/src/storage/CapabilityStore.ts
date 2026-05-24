import { v4 as uuidv4 } from 'uuid';
import type { StorageManager } from './StorageManager';
import type { TechnologyEntry, CapabilitySnapshot } from './schema';

export class CapabilityStore {
  constructor(private readonly storage: StorageManager) {}

  async getTechnologies(): Promise<TechnologyEntry[]> {
    const db = await this.storage.get();
    return db.technologies;
  }

  async upsertTechnology(
    name: string,
    category: TechnologyEntry['category'],
    workspaceId: string,
    tags: string[] = [],
  ): Promise<TechnologyEntry> {
    const db = await this.storage.get();
    const now = new Date().toISOString();
    const key = name.toLowerCase();
    const existing = db.technologies.find(t => t.name.toLowerCase() === key);

    if (existing) {
      existing.lastSeenAt = now;
      existing.exposureCount += 1;
      if (!existing.workspaceIds.includes(workspaceId)) existing.workspaceIds.push(workspaceId);
      for (const tag of tags) {
        if (!existing.tags.includes(tag)) existing.tags.push(tag);
      }
      this.storage.scheduleFlush();
      return existing;
    }

    const entry: TechnologyEntry = {
      id: uuidv4(), name, category, firstSeenAt: now, lastSeenAt: now,
      exposureCount: 1, workspaceIds: [workspaceId], tags,
    };
    db.technologies.push(entry);
    this.storage.scheduleFlush();
    return entry;
  }

  async updateNotes(id: string, notes: string): Promise<void> {
    const db = await this.storage.get();
    const entry = db.technologies.find(t => t.id === id);
    if (entry) {
      entry.notes = notes;
      this.storage.scheduleFlush();
    }
  }

  async getSnapshots(): Promise<CapabilitySnapshot[]> {
    const db = await this.storage.get();
    return db.capabilitySnapshots;
  }

  async addSnapshot(snapshot: CapabilitySnapshot): Promise<void> {
    const db = await this.storage.get();
    db.capabilitySnapshots.push(snapshot);
    if (db.capabilitySnapshots.length > 50) {
      db.capabilitySnapshots = db.capabilitySnapshots.slice(-50);
    }
    this.storage.scheduleFlush();
  }

  async getLatestSnapshot(): Promise<CapabilitySnapshot | undefined> {
    const db = await this.storage.get();
    return db.capabilitySnapshots.at(-1);
  }
}
