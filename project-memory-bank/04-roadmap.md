# Roadmap

## Current Phase: Phase 1 — VSCode Repo Cognition Engine

### Phase 1 Deliverables

- [x] Project memory bank (this directory)
- [x] VSCode extension scaffold
- [ ] AI provider layer (Claude, OpenAI-compat, Ollama)
- [ ] Local JSON storage (memories, repo summaries)
- [ ] Repo scanner (FileWalker, ContextBuilder, DependencyParser)
- [ ] Hybrid search (MiniSearch keyword + cosine semantic + temporal)
- [ ] Commands: summarizeRepo, searchMemory, generateOnboarding, recordMemory, clearCache
- [ ] Webview sidebar (search + summary view)
- [ ] Unit tests
- [ ] Build + package verification

### Phase 1 Success Criteria

- Extension activates in < 100ms overhead
- Repo summary generated for TypeScript, Python, Go repos
- Search returns results in < 200ms (keyword mode)
- Memory persists across VSCode restarts
- `.vsix` packages and installs cleanly

---

## Phase 2 — Persistent Engineering Memory (Enhanced) ✓ COMPLETE

- [x] Memory linking (bidirectional, MemoryLinker)
- [x] Memory timeline view (webview tab, grouped by date)
- [x] Export to Markdown (with type filter, save dialog)
- [x] Memory provenance tracking (git commit hash captured on record)
- [x] Conflict/staleness detection (file-existence + line-diff via git)

## Phase 3 — Semantic Retrieval + Hybrid Search (Advanced) ✓ COMPLETE

- [x] Dedicated embedding model integration (Voyage AI, local models via Ollama/OpenAI-compat)
- [x] HNSW index for scalable semantic search (pure TypeScript, no native modules)
- [x] Cross-workspace memory retrieval (`pecs.crossWorkspaceSearch`)
- [x] Temporal decay and recency weighting (configurable `temporalHalfLifeDays`)

## Phase 4 — Workflow Intelligence ✓ COMPLETE

- [x] Reusable engineering playbooks (WorkflowStore CRUD)
- [x] Deterministic workflow stages (WorkflowEngine stage/step execution)
- [x] AI-assisted execution steps (prompt interpolation + AI provider call)
- [x] Approval checkpoints (injected ApprovalGate, stage + step level)
- [x] Workflow recording from session history (WorkflowRecorder from memories)

## Phase 5 — Capability Tracking ✓ COMPLETE

- [x] Technology exposure tracking (TechnologyTracker, 50+ tech registry, 6 categories)
- [x] Workflow maturity metrics (WorkflowMetricsCalculator — success rate, avg stages/steps, most-run)
- [x] Capability snapshot storage (CapabilityStore, ring-buffer of 50 snapshots)
- [x] Capability report (CapabilityReportBuilder — Markdown + webview Capabilities tab)
- [x] Local-only, user-controlled, privacy-preserving

## Phase 6 — Desktop Cognition OS ✓ COMPLETE

- [x] Native desktop app (Electron — `desktop/`)
- [x] Always-available cognition layer (system tray + background REST API server on :39457)
- [x] Multi-editor support (REST API spec + Neovim plugin — `editor-plugins/`)
- [x] Optional cloud sync (HTTP PUT/GET export/import — CloudSync module)
- [x] 19 unit tests (API routes + CloudSync)

## Phase 7 — AI Orchestration Layer

- Multi-agent workflow execution
- Cross-project memory synthesis
- Team cognition sharing (self-hosted)
- CLI for headless environments
