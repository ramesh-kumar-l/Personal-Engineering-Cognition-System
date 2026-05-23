import * as vscode from 'vscode';
import type { AIProvider } from '../providers/AIProvider';
import type { MemoryStore } from '../storage/MemoryStore';
import type { SearchResult } from '../storage/schema';
import { KeywordIndex } from './KeywordIndex';
import { EmbeddingService } from './EmbeddingService';
import { Ranker } from './Ranker';

export class SearchEngine {
  readonly keywordIndex: KeywordIndex;
  private readonly ranker: Ranker;

  constructor(
    private readonly memoryStore: MemoryStore,
    private readonly provider: AIProvider,
    readonly embeddingService: EmbeddingService
  ) {
    this.keywordIndex = new KeywordIndex();
    this.ranker = new Ranker();
  }

  async reindex(workspaceId: string): Promise<void> {
    const workspaceMemories = await this.memoryStore.getAll(workspaceId);
    this.keywordIndex.indexMemories(workspaceMemories);

    // HNSW initialized with all workspaces so cross-workspace search works without re-indexing
    const allMemories = await this.memoryStore.getAllWorkspaces();
    this.embeddingService.initialize(allMemories);
  }

  async query(query: string, workspaceId: string): Promise<SearchResult[]> {
    const cfg = vscode.workspace.getConfiguration('pecs');
    const maxResults = cfg.get<number>('search.maxResults', 10);
    const halfLifeDays = cfg.get<number>('search.temporalHalfLifeDays', 30);

    const memories = await this.memoryStore.getAll(workspaceId);
    const keywordHits = this.keywordIndex.search(query);

    let semanticHits = [];
    if (this.embeddingService.isEnabled) {
      const queryVector = await this.embeddingService.embedQuery(query);
      if (queryVector) {
        const allowedIds = new Set(memories.map(m => m.id));
        semanticHits = this.embeddingService.searchSemantic(queryVector, maxResults * 2, allowedIds);
      }
    }

    return this.ranker.rank(memories, keywordHits, semanticHits, maxResults, { halfLifeDays });
  }

  async queryAllWorkspaces(query: string): Promise<SearchResult[]> {
    const cfg = vscode.workspace.getConfiguration('pecs');
    const maxResults = cfg.get<number>('search.maxResults', 10) * 2;
    const halfLifeDays = cfg.get<number>('search.temporalHalfLifeDays', 30);

    const allMemories = await this.memoryStore.getAllWorkspaces();

    // Build a temporary keyword index over all workspaces
    const tempIndex = new KeywordIndex();
    tempIndex.indexMemories(allMemories);
    const keywordHits = tempIndex.search(query);

    let semanticHits = [];
    if (this.embeddingService.isEnabled) {
      const queryVector = await this.embeddingService.embedQuery(query);
      if (queryVector) {
        semanticHits = this.embeddingService.searchSemantic(queryVector, maxResults * 2);
      }
    }

    return this.ranker.rank(allMemories, keywordHits, semanticHits, maxResults, { halfLifeDays });
  }

  // Delegates to EmbeddingService; kept for backward compatibility with recordMemory
  async addMemoryEmbedding(memoryId: string, text: string): Promise<number[] | undefined> {
    return this.embeddingService.embedAndIndex(memoryId, text);
  }
}
