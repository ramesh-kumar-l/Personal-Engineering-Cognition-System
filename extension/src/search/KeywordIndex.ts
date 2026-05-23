import MiniSearch from 'minisearch';
import type { Memory } from '../storage/schema';

type IndexedMemory = {
  id: string;
  title: string;
  content: string;
  tags: string;
  type: string;
  createdAt: string;
  filePath: string;
};

export type KeywordHit = {
  id: string;
  score: number;
  title: string;
  createdAt: string;
  type: string;
};

export class KeywordIndex {
  private ms: MiniSearch<IndexedMemory>;

  constructor() {
    this.ms = new MiniSearch<IndexedMemory>({
      fields: ['title', 'content', 'tags'],
      storeFields: ['id', 'title', 'type', 'createdAt', 'filePath'],
      searchOptions: {
        boost: { title: 2.5, tags: 1.5, content: 1 },
        fuzzy: 0.2,
        prefix: true,
      },
    });
  }

  indexMemories(memories: Memory[]): void {
    this.ms.removeAll();
    const docs: IndexedMemory[] = memories.map(m => ({
      id: m.id,
      title: m.title,
      content: m.content,
      tags: m.tags.join(' '),
      type: m.type,
      createdAt: m.createdAt,
      filePath: m.filePath ?? '',
    }));
    this.ms.addAll(docs);
  }

  search(query: string): KeywordHit[] {
    if (!query.trim()) return [];
    const results = this.ms.search(query);
    return results.map(r => ({
      id: r.id as string,
      score: r.score,
      title: r.title as string,
      createdAt: r.createdAt as string,
      type: r.type as string,
    }));
  }

  serialize(): string {
    return JSON.stringify(this.ms);
  }

  deserialize(data: string): void {
    this.ms = MiniSearch.loadJSON<IndexedMemory>(data, {
      fields: ['title', 'content', 'tags'],
      storeFields: ['id', 'title', 'type', 'createdAt', 'filePath'],
    });
  }
}
