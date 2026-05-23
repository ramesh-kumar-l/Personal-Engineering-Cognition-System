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

## Phase 2 — Persistent Engineering Memory (Enhanced)

- Memory tagging, categorization, linking
- Memory timeline view
- Export to Markdown
- Memory provenance tracking (which file, which commit)
- Conflict/staleness detection

## Phase 3 — Semantic Retrieval + Hybrid Search (Advanced)

- Dedicated embedding model integration (Voyage AI, local models)
- HNSW index for scalable semantic search
- Cross-workspace memory retrieval
- Temporal decay and recency weighting

## Phase 4 — Workflow Intelligence

- Reusable engineering playbooks
- Deterministic workflow stages
- AI-assisted execution steps
- Approval checkpoints
- Workflow recording from session history

## Phase 5 — Capability Tracking

- Technology exposure tracking
- Workflow maturity metrics
- Architecture competency mapping
- Local-only, user-controlled, privacy-preserving

## Phase 6 — Desktop Cognition OS

- Native desktop app (Tauri or Electron)
- Always-available cognition layer
- Multi-editor support (JetBrains, Neovim, Emacs)
- Optional cloud sync

## Phase 7 — AI Orchestration Layer

- Multi-agent workflow execution
- Cross-project memory synthesis
- Team cognition sharing (self-hosted)
- CLI for headless environments
