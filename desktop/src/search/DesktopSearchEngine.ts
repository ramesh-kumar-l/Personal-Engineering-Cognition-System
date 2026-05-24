import { KeywordIndex } from './KeywordIndex';
import { Ranker } from './Ranker';
import type { MemoryStore } from '../storage/MemoryStore';
import type { SearchResult } from '../storage/schema';

export type SearchOptions = {
  maxResults?: number;
  halfLifeDays?: number;
};

export class DesktopSearchEngine {
  private readonly keywordIndex: KeywordIndex;
  private readonly ranker: Ranker;

  constructor(private readonly memoryStore: MemoryStore) {
    this.keywordIndex = new KeywordIndex();
    this.ranker = new Ranker();
  }

  async query(query: string, workspaceId?: string, opts: SearchOptions = {}): Promise<SearchResult[]> {
    const { maxResults = 20, halfLifeDays = 30 } = opts;
    const memories = workspaceId
      ? await this.memoryStore.getAll(workspaceId)
      : await this.memoryStore.getAllWorkspaces();

    this.keywordIndex.indexMemories(memories);
    const keywordHits = this.keywordIndex.search(query);

    return this.ranker.rank(memories, keywordHits, [], maxResults, { halfLifeDays });
  }
}
