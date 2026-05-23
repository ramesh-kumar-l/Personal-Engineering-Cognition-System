# Open Questions

## Active Questions

### Q1: Embedding provider for Claude users

**Problem:** Claude (Anthropic) has no native embeddings API. Claude is the default provider. This means semantic search is unavailable by default.

**Options:**
- A: Keep it as-is — Claude users get keyword-only search. Communicate this clearly in the UI.
- B: Integrate Voyage AI (Anthropic's recommended embedding partner) as a separate optional provider for embeddings only.
- C: Offer a local embedding option (e.g., `nomic-embed-text` via Ollama) as a secondary embedding source even when using Claude for completions.

**Current decision:** Option A (Phase 1). Option C is the likely Phase 2 upgrade — a separate `embeddingProvider` config that can differ from `aiProvider`.

---

### Q2: Search weight tuning

**Current weights:** keyword: 0.5, semantic: 0.35, temporal: 0.15

These are initial estimates. Should be validated against real usage. Consider making them configurable via `pecs.search.weights.*` settings in Phase 2.

---

### Q3: Onboarding doc format

Should `pecs.generateOnboarding` output:
- A: Markdown file opened in editor
- B: Markdown displayed in webview with copy button
- C: Both, with a save prompt

**Current decision:** A (simplest) with a prompt to save as `ONBOARDING.md`.

---

### Q4: Memory deduplication

If a user records a memory about the same topic twice, should PECS:
- A: Allow duplicates (simple, always correct)
- B: Warn on high keyword similarity (< 100ms check with MiniSearch)
- C: AI-powered deduplication (expensive, Phase 3)

**Current decision:** A for Phase 1.

---

### Q5: Multi-root workspaces

VSCode supports multi-root workspaces (multiple folders). Should PECS:
- A: Use the first folder only (Phase 1 simplification)
- B: Present a picker when multiple roots exist
- C: Scan all roots and combine context

**Current decision:** A for Phase 1, with the workspace picker as Phase 2.

## Resolved Questions

- **SQLite vs JSON**: Resolved → JSON flat-file (no native modules, simpler)
- **React vs vanilla TS**: Resolved → vanilla TS (smaller bundle, simpler)
- **webpack vs esbuild**: Resolved → esbuild (faster, simpler)
- **Activation event**: Resolved → `onStartupFinished` (no startup tax)
