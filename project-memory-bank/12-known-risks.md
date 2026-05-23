# Known Risks

## Risk Register

### R1: Token budget overflow on large repos

**Probability:** Medium (large monorepos common)
**Impact:** High (summary quality degrades or API call fails)
**Mitigation:**
- FileWalker enforces `maxFilesPerScan` (default 500) with priority sorting
- ContextBuilder enforces 80,000 char hard cap
- Files are truncated individually before budget is exceeded
- Large files (> 100KB by default) are excluded
**Status:** Mitigated by design. Monitor via `tokenCount` field in `RepoSummary`.

---

### R2: No embeddings for Claude provider

**Probability:** Certain (Anthropic has no embeddings API)
**Impact:** Medium (semantic search unavailable for default provider)
**Mitigation:**
- `AIProvider.embed` is optional — providers that don't support it leave it undefined
- SearchEngine degrades gracefully to keyword-only when embed is unavailable
- UI communicates this clearly ("Semantic search requires Ollama or OpenAI-compat provider")
**Status:** Accepted for Phase 1. Phase 2 adds separate embedding provider config.

---

### R3: Windows path handling

**Probability:** Low (Windows-specific edge cases)
**Impact:** Medium (storage corruption or file not found)
**Mitigation:**
- All path operations use `path.join()` — never string concatenation
- `context.globalStorageUri.fsPath` used (not manually constructed paths)
- Atomic write uses `fs.rename` within same volume (Windows-safe)
**Status:** Mitigated by using Node path APIs consistently.

---

### R4: VSCode API breaking changes

**Probability:** Low (VSCode maintains strong extension API stability)
**Impact:** High (extension stops working)
**Mitigation:**
- `engines.vscode: "^1.90.0"` — only uses stable APIs
- `WebviewViewProvider` has been stable since VSCode 1.49
- `globalStorageUri` stable since VSCode 1.56
- `context.secrets` stable since VSCode 1.53
**Status:** Accepted. Monitor VSCode release notes.

---

### R5: MiniSearch index staleness

**Probability:** Medium (write operations must update index)
**Impact:** Medium (search misses recently added memories)
**Mitigation:**
- `MemoryStore.add/update/delete` calls `keywordIndex.indexMemories()` after mutation
- Index is rebuilt from full memory list (not incremental) — always consistent
**Status:** Mitigated. Monitor performance if memory count exceeds 10,000.

---

### R6: esbuild bundle includes unexpected globals

**Probability:** Low
**Impact:** Low (bundle size increase, possible runtime errors)
**Mitigation:**
- `vscode` is always marked `external`
- Bundle size is verified as part of packaging step (`< 2MB`)
- `platform: 'node'` prevents browser polyfills from being injected
**Status:** Low risk. Verify with `npm run package` output.

---

### R7: OpenAI-compat fetch timeout hangs extension

**Probability:** Low (misconfigured server)
**Impact:** High (command hangs indefinitely)
**Mitigation:**
- All fetch calls use `AbortController` with 30-second timeout
- Command shows cancellable progress notification
**Status:** Mitigated by timeout implementation.

---

### R8: Workspace ID collision

**Probability:** Very Low (base64url of path)
**Impact:** Low (wrong memories shown)
**Mitigation:**
- Workspace ID is base64url of full root path — collisions require identical paths
- On collision (impossible in practice), memories would just be mixed
**Status:** Accepted. Phase 2 can use a proper hash if needed.
