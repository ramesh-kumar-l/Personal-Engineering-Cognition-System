import * as vscode from 'vscode';
import type { AIProvider } from '../providers/AIProvider';
import type { MemoryStore } from '../storage/MemoryStore';
import type { SearchResult } from '../storage/schema';
import { KeywordIndex } from './KeywordIndex';
import { EmbeddingIndex } from './EmbeddingIndex';
import { Ranker } from './Ranker';

export class SearchEngine {
  readonly keywordIndex: KeywordIndex;
  private readonly embeddingIndex: EmbeddingIndex;
  private readonly ranker: Ranker;

  constructor(
    private readonly memoryStore: MemoryStore,
    private readonly provider: AIProvider
  ) {
    this.keywordIndex = new KeywordIndex();
    this.embeddingIndex = new EmbeddingIndex();
    this.ranker = new Ranker();
  }

  async reindex(workspaceId: string): Promise<void> {
    const memories = await this.memoryStore.getAll(workspaceId);
    this.keywordIndex.indexMemories(memories);

    // Rebuild embedding index from stored embeddings (no new API calls)
    this.embeddingIndex.clear();
    for (const memory of memories) {
      if (memory.embedding) {
        this.embeddingIndex.addVector(memory.id, memory.embedding);
      }
    }
  }

  async query(query: string, workspaceId: string): Promise<SearchResult[]> {
    const cfg = vscode.workspace.getConfiguration('pecs');
    const embeddingsEnabled = cfg.get<boolean>('search.embeddingsEnabled', false);
    const maxResults = cfg.get<number>('search.maxResults', 10);

    const memories = await this.memoryStore.getAll(workspaceId);
    const keywordHits = this.keywordIndex.search(query);

    let semanticHits: Array<{ id: string; score: number }> = [];

    if (embeddingsEnabled && this.provider.embed) {
      try {
        const embedding = await this.provider.embed(query);
        semanticHits = this.embeddingIndex.search(embedding.vector, maxResults * 2);
      } catch {
        // Provider doesn't support embeddings or failed — degrade gracefully
      }
    }

    return this.ranker.rank(memories, keywordHits, semanticHits, maxResults);
  }

  async addMemoryEmbedding(
    memoryId: string,
    text: string
  ): Promise<number[] | undefined> {
    if (!this.provider.embed) return undefined;

    try {
      const result = await this.provider.embed(text);
      this.embeddingIndex.addVector(memoryId, result.vector);
      return result.vector;
    } catch {
      return undefined;
    }
  }
}
