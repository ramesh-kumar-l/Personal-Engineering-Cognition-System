# Domain Models

All types are defined in `extension/src/storage/schema.ts` using Zod. TypeScript types are inferred — no duplication.

## Memory

The core entity. Represents a single unit of engineering knowledge.

```typescript
const MemorySchema = z.object({
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
});
```

**Memory types:**
- `debug` — A debugging session, issue, and resolution
- `decision` — An architectural or design decision (ADR-style)
- `learning` — A new insight or technique discovered
- `incident` — A production incident and post-mortem
- `note` — Freeform engineering note

## RepoSummary

AI-generated summary of a repository's architecture. Cached per workspace.

```typescript
const RepoSummarySchema = z.object({
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
```

## SearchResult

A unified result type across memory entries.

```typescript
const SearchResultSchema = z.object({
  id: z.string(),
  type: z.enum(['memory', 'file']),
  title: z.string(),
  excerpt: z.string(),
  filePath: z.string().optional(),
  score: z.number(),
  keywordScore: z.number(),
  semanticScore: z.number().optional(),
  temporalScore: z.number(),
  createdAt: z.string().datetime().optional(),
});
```

## Database

The flat-file storage schema. All persisted data lives here.

```typescript
const DatabaseSchema = z.object({
  version: z.literal(1),
  memories: z.array(MemorySchema),
  summaries: z.record(z.string(), RepoSummarySchema),
  searchIndex: z.string().optional(),
});
```

## WorkspaceId

Not a Zod schema — a derived identifier. Computed from the workspace root path as a base64url-encoded truncated hash. Ensures memories are scoped to the correct project without exposing raw file paths.

```typescript
function getWorkspaceId(rootPath: string): string {
  return Buffer.from(rootPath).toString('base64url').slice(0, 24);
}
```

## Webview Message Protocol

Extension host ↔ Webview message types:

```typescript
type ExtensionToWebview =
  | { type: 'repoSummary'; payload: RepoSummary }
  | { type: 'searchResults'; payload: SearchResult[] }
  | { type: 'loading'; payload: { message: string } }
  | { type: 'error'; payload: { message: string } }
  | { type: 'memoryRecorded'; payload: Memory };

type WebviewToExtension =
  | { type: 'search'; query: string }
  | { type: 'recordMemory'; title: string; content: string; type: Memory['type'] }
  | { type: 'deleteMemory'; id: string }
  | { type: 'ready' };
```
