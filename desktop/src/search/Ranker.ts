import type { Memory, SearchResult } from '../storage/schema';
import type { KeywordHit } from './KeywordIndex';

type SemanticHit = { id: string; score: number };

const WEIGHTS = { keyword: 0.65, temporal: 0.35 };

export type RankOptions = { halfLifeDays?: number };

export class Ranker {
  rank(
    memories: Memory[],
    keywordHits: KeywordHit[],
    semanticHits: SemanticHit[],
    maxResults: number,
    options: RankOptions = {}
  ): SearchResult[] {
    const halfLifeDays = options.halfLifeDays ?? 30;
    const memoryMap = new Map(memories.map(m => [m.id, m]));
    const kwMap = new Map(keywordHits.map(h => [h.id, h.score]));
    const semMap = new Map(semanticHits.map(h => [h.id, h.score]));
    const maxKw = Math.max(...kwMap.values(), 1);

    const candidateIds = new Set([...kwMap.keys(), ...semMap.keys()]);
    const results: SearchResult[] = [];

    for (const id of candidateIds) {
      const memory = memoryMap.get(id);
      if (!memory) continue;

      const keywordScore = (kwMap.get(id) ?? 0) / maxKw;
      const temporalScore = this.temporalScore(memory.createdAt, halfLifeDays);
      const score = WEIGHTS.keyword * keywordScore + WEIGHTS.temporal * temporalScore;

      results.push({
        id, type: 'memory', title: memory.title,
        excerpt: this.makeExcerpt(memory.content),
        filePath: memory.filePath, score, keywordScore, temporalScore,
        createdAt: memory.createdAt, memoryType: memory.type,
        workspaceId: memory.workspaceId,
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults);
  }

  private temporalScore(createdAt: string, halfLifeDays: number): number {
    const ageDays = (Date.now() - new Date(createdAt).getTime()) / 86400000;
    return Math.pow(2, -ageDays / halfLifeDays);
  }

  private makeExcerpt(content: string, maxLen = 200): string {
    const cleaned = content.replace(/\s+/g, ' ').trim();
    return cleaned.length > maxLen ? cleaned.slice(0, maxLen) + '…' : cleaned;
  }
}
