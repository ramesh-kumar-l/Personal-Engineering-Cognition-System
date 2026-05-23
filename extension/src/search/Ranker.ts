import type { Memory, SearchResult } from '../storage/schema';
import type { KeywordHit } from './KeywordIndex';
import type { SemanticHit } from './EmbeddingIndex';

const WEIGHTS = {
  keyword: 0.50,
  semantic: 0.35,
  temporal: 0.15,
};

const TEMPORAL_HALF_LIFE_DAYS = 30;

export class Ranker {
  rank(
    memories: Memory[],
    keywordHits: KeywordHit[],
    semanticHits: SemanticHit[],
    maxResults: number
  ): SearchResult[] {
    const memoryMap = new Map(memories.map(m => [m.id, m]));

    const kwMap = new Map(keywordHits.map(h => [h.id, h.score]));
    const semMap = new Map(semanticHits.map(h => [h.id, h.score]));

    const maxKw = Math.max(...kwMap.values(), 1);
    const maxSem = Math.max(...semMap.values(), 1);

    const candidateIds = new Set([...kwMap.keys(), ...semMap.keys()]);
    const results: SearchResult[] = [];

    for (const id of candidateIds) {
      const memory = memoryMap.get(id);
      if (!memory) continue;

      const keywordScore = (kwMap.get(id) ?? 0) / maxKw;
      const semanticScore = semMap.size > 0 ? (semMap.get(id) ?? 0) / maxSem : undefined;
      const temporalScore = this.temporalScore(memory.createdAt);

      const score =
        WEIGHTS.keyword * keywordScore +
        WEIGHTS.semantic * (semanticScore ?? 0) +
        WEIGHTS.temporal * temporalScore;

      results.push({
        id,
        type: 'memory',
        title: memory.title,
        excerpt: this.makeExcerpt(memory.content),
        filePath: memory.filePath,
        score,
        keywordScore,
        semanticScore,
        temporalScore,
        createdAt: memory.createdAt,
        memoryType: memory.type,
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults);
  }

  private temporalScore(createdAt: string): number {
    const ageMs = Date.now() - new Date(createdAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    // Exponential decay: score = 2^(-age/half_life)
    return Math.pow(2, -ageDays / TEMPORAL_HALF_LIFE_DAYS);
  }

  private makeExcerpt(content: string, maxLen = 200): string {
    const cleaned = content.replace(/\s+/g, ' ').trim();
    return cleaned.length > maxLen ? cleaned.slice(0, maxLen) + '…' : cleaned;
  }
}
