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
  workspaceId: z.string().optional(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

// Phase 4 — Workflow Intelligence schemas
export const WorkflowStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['ai', 'manual', 'command']),
  prompt: z.string().optional(),
  commandId: z.string().optional(),
  requiresApproval: z.boolean().default(false),
});
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

export const WorkflowStageSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  steps: z.array(WorkflowStepSchema),
  requiresApproval: z.boolean().default(false),
});
export type WorkflowStage = z.infer<typeof WorkflowStageSchema>;

export const WorkflowStepResultSchema = z.object({
  stepId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
  output: z.string().optional(),
  error: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
});
export type WorkflowStepResult = z.infer<typeof WorkflowStepResultSchema>;

export const WorkflowRunSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  status: z.enum(['pending', 'running', 'paused', 'completed', 'failed', 'cancelled']),
  currentStageIndex: z.number().default(0),
  stepResults: z.array(WorkflowStepResultSchema).default([]),
  context: z.record(z.string(), z.string()).default({}),
  startedAt: z.string(),
  completedAt: z.string().optional(),
});
export type WorkflowRun = z.infer<typeof WorkflowRunSchema>;

export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()).default([]),
  stages: z.array(WorkflowStageSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  runs: z.array(WorkflowRunSchema).default([]),
  recordedFromMemoryIds: z.array(z.string()).optional(),
});
export type Workflow = z.infer<typeof WorkflowSchema>;

// Phase 5 — Capability Tracking schemas
export const TechnologyCategorySchema = z.enum([
  'language', 'framework', 'tool', 'platform', 'pattern', 'service',
]);
export type TechnologyCategory = z.infer<typeof TechnologyCategorySchema>;

export const TechnologyEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  category: TechnologyCategorySchema,
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
  exposureCount: z.number().int().nonnegative(),
  workspaceIds: z.array(z.string()),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
});
export type TechnologyEntry = z.infer<typeof TechnologyEntrySchema>;

export const WorkflowMaturitySchema = z.object({
  totalWorkflows: z.number(),
  totalRuns: z.number(),
  successRate: z.number(),
  avgStagesPerWorkflow: z.number(),
  avgStepsPerWorkflow: z.number(),
  mostRunWorkflowId: z.string().optional(),
  mostRunWorkflowName: z.string().optional(),
});
export type WorkflowMaturity = z.infer<typeof WorkflowMaturitySchema>;

export const CapabilitySnapshotSchema = z.object({
  id: z.string(),
  capturedAt: z.string(),
  technologies: z.array(TechnologyEntrySchema),
  workflowMaturity: WorkflowMaturitySchema,
  memoryCount: z.number(),
  workspaceIds: z.array(z.string()),
});
export type CapabilitySnapshot = z.infer<typeof CapabilitySnapshotSchema>;

export const DatabaseSchema = z.object({
  version: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  memories: z.array(MemorySchema),
  summaries: z.record(z.string(), RepoSummarySchema),
  workflows: z.array(WorkflowSchema).default([]),
  technologies: z.array(TechnologyEntrySchema).default([]),
  capabilitySnapshots: z.array(CapabilitySnapshotSchema).default([]),
  searchIndex: z.string().optional(),
});
export type Database = z.infer<typeof DatabaseSchema>;

export function emptyDatabase(): Database {
  return {
    version: 5,
    memories: [],
    summaries: {},
    workflows: [],
    technologies: [],
    capabilitySnapshots: [],
  };
}

// Phase 4 view types
export type WorkflowListItem = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  stageCount: number;
  stepCount: number;
  runCount: number;
  lastRunAt?: string;
  lastRunStatus?: WorkflowRun['status'];
};

export type WorkflowDetail = {
  workflow: Workflow;
  lastRun?: WorkflowRun;
};

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
