import type { Memory } from '../storage/schema';
import type { EmbeddingProvider } from '../providers/AIProvider';
import { HNSWIndex, type SemanticHit } from './HNSWIndex';

export class EmbeddingService {
  private readonly hnswIndex: HNSWIndex;

  constructor(private readonly provider: EmbeddingProvider | null) {
    this.hnswIndex = new HNSWIndex();
  }

  get isEnabled(): boolean {
    return this.provider !== null;
  }

  get indexSize(): number {
    return this.hnswIndex.size;
  }

  // Rebuild HNSW from stored embeddings (no API calls — vectors already in storage)
  initialize(memories: Memory[]): void {
    this.hnswIndex.clear();
    for (const m of memories) {
      if (m.embedding && m.embedding.length > 0) {
        this.hnswIndex.insert(m.id, m.embedding);
      }
    }
  }

  // Embed text for storage and insert into HNSW index
  async embedAndIndex(
    memoryId: string,
    text: string
  ): Promise<number[] | undefined> {
    if (!this.provider) return undefined;
    try {
      const result = await this.provider.embed(text, { inputType: 'document' });
      this.hnswIndex.insert(memoryId, result.vector);
      return result.vector;
    } catch {
      return undefined;
    }
  }

  // Embed a search query (uses query-optimized embedding when provider supports it)
  async embedQuery(text: string): Promise<number[] | undefined> {
    if (!this.provider) return undefined;
    try {
      const result = await this.provider.embed(text, { inputType: 'query' });
      return result.vector;
    } catch {
      return undefined;
    }
  }

  // ANN search via HNSW, optionally filtered to a set of memory IDs
  searchSemantic(
    queryVector: number[],
    topK: number,
    allowedIds?: Set<string>
  ): SemanticHit[] {
    // Over-fetch to have enough after filtering
    const fetchK = allowedIds ? Math.min(topK * 4, this.hnswIndex.size) : topK;
    const hits = this.hnswIndex.search(queryVector, Math.max(fetchK, 1));

    if (!allowedIds) return hits.slice(0, topK);
    return hits.filter(h => allowedIds.has(h.id)).slice(0, topK);
  }

  removeFromIndex(id: string): void {
    this.hnswIndex.remove(id);
  }
}
