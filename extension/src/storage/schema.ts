import { z } from 'zod';

export const MemorySchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string(),
  type: z.enum(['debug', 'decision', 'learning', 'incident', 'note']),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  filePath: z.string().optional(),
  lineRange: z.object({ start: z.number(), end: z.number() }).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  embedding: z.array(z.number()).optional(),
  // Phase 2 fields
  linkedMemoryIds: z.array(z.string().uuid()).optional(),
  commitHash: z.string().optional(),
  stalenessStatus: z.enum(['fresh', 'stale', 'unknown']).optional(),
  stalenessCheckedAt: z.string().datetime().optional(),
});
export type Memory = z.infer<typeof MemorySchema>;

export const RepoSummarySchema = z.object({
  workspaceId: z.string(),
  generatedAt: z.string().datetime(),
  architecture: z.string(),
  keyModules: z.array(z.object({ name: z.string(), purpose: z.string() })),
  dependencies: z.record(z.string(), z.string()),
  techStack: z.array(z.string()),
  fileCount: z.number(),
  tokenCount: z.number(),
  model: z.string(),
});
export type RepoSummary = z.infer<typeof RepoSummarySchema>;

export const SearchResultSchema = z.object({
  id: z.string(),
  type: z.enum(['memory']),
  title: z.string(),
  excerpt: z.string(),
  filePath: z.string().optional(),
  score: z.number(),
  keywordScore: z.number(),
  semanticScore: z.number().optional(),
  temporalScore: z.number(),
  createdAt: z.string().datetime().optional(),
  memoryType: z.enum(['debug', 'decision', 'learning', 'incident', 'note']).optional(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

export const DatabaseSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  memories: z.array(MemorySchema),
  summaries: z.record(z.string(), RepoSummarySchema),
  searchIndex: z.string().optional(),
});
export type Database = z.infer<typeof DatabaseSchema>;

export function emptyDatabase(): Database {
  return {
    version: 2,
    memories: [],
    summaries: {},
  };
}

// Phase 2 view types
export type TimelineEntry = {
  id: string;
  type: Memory['type'];
  title: string;
  createdAt: string;
  tags: string[];
  filePath?: string;
  stalenessStatus?: Memory['stalenessStatus'];
  linkedCount: number;
};

export type MemoryDetail = {
  memory: Memory;
  linkedMemories: Array<{ id: string; title: string; type: string; createdAt: string }>;
};

export type StalenessReport = {
  total: number;
  fresh: number;
  stale: number;
  unknown: number;
  staleMemories: Array<{ id: string; title: string; filePath?: string }>;
};
