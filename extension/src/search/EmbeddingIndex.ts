type VectorEntry = {
  id: string;
  vector: number[];
};

export type SemanticHit = {
  id: string;
  score: number;
};

export class EmbeddingIndex {
  private vectors: Map<string, VectorEntry> = new Map();

  addVector(id: string, vector: number[]): void {
    this.vectors.set(id, { id, vector });
  }

  removeVector(id: string): void {
    this.vectors.delete(id);
  }

  clear(): void {
    this.vectors.clear();
  }

  search(queryVector: number[], topK: number): SemanticHit[] {
    if (this.vectors.size === 0 || queryVector.length === 0) return [];

    const scores: SemanticHit[] = [];
    for (const entry of this.vectors.values()) {
      const score = cosineSimilarity(queryVector, entry.vector);
      if (score > 0) {
        scores.push({ id: entry.id, score });
      }
    }

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, topK);
  }

  size(): number {
    return this.vectors.size;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
