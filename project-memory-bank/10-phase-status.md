# Phase Status

## Phase 3 — Semantic Retrieval + HNSW (Advanced Search)

**Completed:** 2026-05-23
**Status:** Done ✓

### Deliverables
- [x] `EmbeddingProvider` interface in `AIProvider.ts` (separate from `AIProvider`)
- [x] `HNSWIndex` — pure-TypeScript HNSW with binary min/max heaps, O(log n) ANN search
- [x] `VoyageProvider` — Voyage AI REST embedding provider (voyage-3-lite / voyage-3 / voyage-code-3)
- [x] `EmbeddingService` — orchestrates HNSW init from stored embeddings, embed-and-index, query embedding, workspace-filtered search
- [x] Schema v3: `workspaceId` added to `SearchResultSchema`; `DatabaseSchema` version bumped to accept 1/2/3
- [x] `StorageManager` v2→v3 migration (zero-downtime, all fields optional)
- [x] `MemoryStore.getAllWorkspaces()` — returns all memories across workspaces
- [x] `SearchEngine` refactored to use `EmbeddingService`; added `queryAllWorkspaces()`
- [x] `Ranker` updated: includes `workspaceId` in results; configurable `halfLifeDays` via `RankOptions`
- [x] `ProviderFactory.getEmbeddingProvider()` — Voyage > provider.embed > null priority chain
- [x] `pecs.crossWorkspaceSearch` command — input box → search all workspaces → sidebar
- [x] `pecs.voyage.apiKey` / `pecs.voyage.model` / `pecs.search.temporalHalfLifeDays` settings
- [x] Webview: cross-workspace results show italic workspace name chip; header shows "· all workspaces"
- [x] 14 new unit tests (HNSWIndex 8, EmbeddingService 6)
- [x] Build passes (dist/extension.js 1.1MB, dist/webview.js 12.1KB)
- [x] 67/67 tests pass

---

## Phase 2 — Persistent Engineering Memory (Enhanced)

**Completed:** 2026-05-23
**Status:** Done ✓

### Deliverables
- [x] Schema v2: `linkedMemoryIds`, `commitHash`, `stalenessStatus`, `stalenessCheckedAt` fields
- [x] v1→v2 migration in StorageManager (zero-downtime, backward-compatible)
- [x] `MemoryLinker` — bidirectional memory linking with deduplication guard
- [x] `ProvenanceTracker` — captures git commit hash at memory creation
- [x] `StalenessDetector` — file-existence + line-diff staleness check via git
- [x] `exportMemories` command — filtered Markdown export with save dialog
- [x] `linkMemory` command — quick-pick linking flow
- [x] `viewTimeline` command — chronological timeline pushed to webview
- [x] `checkStaleness` command — batch staleness scan with report
- [x] Webview Phase 2 UI: tab bar (Search/Timeline), memory detail view, staleness indicators
- [x] `recordMemory` updated to capture git commit hash automatically
- [x] `extension.ts` wires all Phase 2 modules; routes `openMemoryDetail`/`linkFromDetail` messages
- [x] 13 new unit tests (MemoryLinker 7, ProvenanceTracker 2, StalenessDetector 4)
- [x] Build passes (dist/extension.js 1.1MB, dist/webview.js 11.5KB)
- [x] 53/53 tests pass

---

## Phase 1 — VSCode Repo Cognition Engine

**Completed:** 2026-05-23
**Status:** Done ✓

### Completed

- [x] Project memory bank (13 files)
- [x] `.gitignore`
- [x] `README.md`

### In Progress

- [ ] `extension/package.json`
- [ ] `extension/tsconfig.json`
- [ ] `extension/esbuild.mjs`
- [ ] `extension/vitest.config.ts`
- [ ] `extension/.vscodeignore`

### Pending

**Providers:**
- [ ] `src/providers/AIProvider.ts`
- [ ] `src/providers/ClaudeProvider.ts`
- [ ] `src/providers/OpenAICompatProvider.ts`
- [ ] `src/providers/OllamaProvider.ts`
- [ ] `src/providers/ProviderFactory.ts`

**Storage:**
- [ ] `src/storage/schema.ts`
- [ ] `src/storage/StorageManager.ts`
- [ ] `src/storage/MemoryStore.ts`
- [ ] `src/storage/SummaryCache.ts`

**Scanner:**
- [ ] `src/scanner/FileWalker.ts`
- [ ] `src/scanner/LanguageDetector.ts`
- [ ] `src/scanner/DependencyParser.ts`
- [ ] `src/scanner/ContextBuilder.ts`
- [ ] `src/scanner/RepoScanner.ts`

**Search:**
- [ ] `src/search/KeywordIndex.ts`
- [ ] `src/search/EmbeddingIndex.ts`
- [ ] `src/search/Ranker.ts`
- [ ] `src/search/SearchEngine.ts`

**Commands:**
- [ ] `src/commands/summarizeRepo.ts`
- [ ] `src/commands/searchMemory.ts`
- [ ] `src/commands/generateOnboarding.ts`
- [ ] `src/commands/recordMemory.ts`
- [ ] `src/commands/clearCache.ts`

**Webview:**
- [ ] `src/webview/PecsPanel.ts`
- [ ] `src/webview/webview-ui/main.ts`
- [ ] `src/webview/webview-ui/styles.css`

**Entry + Utils:**
- [ ] `src/utils/logger.ts`
- [ ] `src/utils/tokenBudget.ts`
- [ ] `src/utils/config.ts`
- [ ] `src/extension.ts`

**Tests:**
- [ ] `test/unit/storage.test.ts`
- [ ] `test/unit/scanner.test.ts`
- [ ] `test/unit/search.test.ts`
- [ ] `test/unit/providers.test.ts`

**Verification:**
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] Extension activates in Extension Development Host
- [ ] `npm run package` produces clean `.vsix`
