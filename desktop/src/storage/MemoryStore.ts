import { v4 as uuidv4 } from 'uuid';
import { MemorySchema, type Memory } from './schema';
import type { StorageManager } from './StorageManager';

type MemoryInput = Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>;

export class MemoryStore {
  constructor(readonly storage: StorageManager) {}

  async add(input: MemoryInput): Promise<Memory> {
    const db = await this.storage.get();
    const now = new Date().toISOString();
    const memory: Memory = { ...input, id: uuidv4(), createdAt: now, updatedAt: now };
    db.memories.push(memory);
    this.storage.scheduleFlush();
    return memory;
  }

  async importMemories(memories: Memory[]): Promise<number> {
    const db = await this.storage.get();
    const existingIds = new Set(db.memories.map(m => m.id));
    const toAdd = memories.filter(m => {
      const parsed = MemorySchema.safeParse(m);
      return parsed.success && !existingIds.has(m.id);
    });
    db.memories.push(...toAdd);
    if (toAdd.length > 0) this.storage.scheduleFlush();
    return toAdd.length;
  }

  async getAll(workspaceId: string): Promise<Memory[]> {
    const db = await this.storage.get();
    return db.memories.filter(m => m.workspaceId === workspaceId);
  }

  async getAllWorkspaces(): Promise<Memory[]> {
    const db = await this.storage.get();
    return db.memories;
  }

  async getById(id: string): Promise<Memory | undefined> {
    const db = await this.storage.get();
    return db.memories.find(m => m.id === id);
  }

  async update(id: string, patch: Partial<Omit<Memory, 'id' | 'createdAt' | 'workspaceId'>>): Promise<Memory | null> {
    const db = await this.storage.get();
    const idx = db.memories.findIndex(m => m.id === id);
    if (idx === -1) return null;
    db.memories[idx] = { ...db.memories[idx], ...patch, updatedAt: new Date().toISOString() };
    this.storage.scheduleFlush();
    return db.memories[idx];
  }

  async delete(id: string): Promise<boolean> {
    const db = await this.storage.get();
    const before = db.memories.length;
    db.memories = db.memories.filter(m => m.id !== id);
    if (db.memories.length < before) {
      this.storage.scheduleFlush();
      return true;
    }
    return false;
  }

  async count(): Promise<number> {
    const db = await this.storage.get();
    return db.memories.length;
  }
}
