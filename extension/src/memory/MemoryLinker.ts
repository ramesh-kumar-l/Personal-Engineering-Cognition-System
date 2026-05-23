import type { Memory } from '../storage/schema';
import type { MemoryStore } from '../storage/MemoryStore';

export class MemoryLinker {
  constructor(private readonly store: MemoryStore) {}

  async link(idA: string, idB: string): Promise<boolean> {
    const [a, b] = await Promise.all([this.store.getById(idA), this.store.getById(idB)]);
    if (!a || !b || idA === idB) return false;

    const aLinks = new Set(a.linkedMemoryIds ?? []);
    const bLinks = new Set(b.linkedMemoryIds ?? []);
    if (aLinks.has(idB)) return true; // already linked

    aLinks.add(idB);
    bLinks.add(idA);

    await Promise.all([
      this.store.update(idA, { linkedMemoryIds: [...aLinks] }),
      this.store.update(idB, { linkedMemoryIds: [...bLinks] }),
    ]);
    return true;
  }

  async unlink(idA: string, idB: string): Promise<boolean> {
    const [a, b] = await Promise.all([this.store.getById(idA), this.store.getById(idB)]);
    if (!a || !b) return false;

    await Promise.all([
      this.store.update(idA, { linkedMemoryIds: (a.linkedMemoryIds ?? []).filter(id => id !== idB) }),
      this.store.update(idB, { linkedMemoryIds: (b.linkedMemoryIds ?? []).filter(id => id !== idA) }),
    ]);
    return true;
  }

  async getLinked(id: string): Promise<Memory[]> {
    const memory = await this.store.getById(id);
    if (!memory?.linkedMemoryIds?.length) return [];
    const results = await Promise.all(memory.linkedMemoryIds.map(lid => this.store.getById(lid)));
    return results.filter((m): m is Memory => m !== undefined);
  }
}
