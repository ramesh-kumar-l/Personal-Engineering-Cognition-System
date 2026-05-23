# Workflows

## Core User Workflows

### 1. Repo Summarization

**Trigger:** Command Palette → "PECS: Summarize Repository Architecture"

**Steps:**
1. Check summary cache (24h TTL) — return cached if fresh
2. Walk workspace files (gitignore-aware, priority-sorted, max 500 files)
3. Parse manifest files for dependencies
4. Build prompt context within 80k char budget
5. Send to AI provider for architecture summary
6. Display in PECS sidebar
7. Cache result

**User value:** Instant architecture orientation for any repo, onboarding acceleration, AI-grounded understanding of what the codebase does.

---

### 2. Recording Engineering Memory

**Trigger:** Select code/text in editor → right-click → "PECS: Record Engineering Memory"
**Or:** Command Palette → "PECS: Record Engineering Memory"

**Steps:**
1. Capture selected text + file path + line range (if from editor)
2. Show quick-pick for memory type (debug / decision / learning / incident / note)
3. Input box for title
4. Input box for additional context
5. Store memory with embedding (if provider supports it)
6. Update keyword search index
7. Confirm recorded

**User value:** Captures knowledge at the moment it's generated, not as a separate task.

---

### 3. Searching Engineering Memory

**Trigger:** Command Palette → "PECS: Search Engineering Memory"
**Or:** Type in PECS sidebar search box

**Steps:**
1. User types query
2. Keyword search (MiniSearch) → results with scores
3. If embeddings enabled: embed query → cosine similarity → semantic results
4. Merge + rank (keyword 50%, semantic 35%, temporal 15%)
5. Display results in sidebar with excerpts

**User value:** Find relevant past debugging sessions, decisions, and learnings without remembering exact keywords.

---

### 4. Onboarding Doc Generation

**Trigger:** Command Palette → "PECS: Generate Onboarding Document"

**Steps:**
1. Run repo scan (or use cached summary)
2. Apply onboarding prompt template with repo context
3. Generate structured onboarding doc (setup, architecture, key modules, gotchas)
4. Open in new editor tab as Markdown
5. Optionally save to workspace as `ONBOARDING.md`

**User value:** Auto-generate onboarding documentation for any repository, eliminating "walk new engineer through codebase" meetings.

---

### 5. Cache Management

**Trigger:** Command Palette → "PECS: Clear Repo Summary Cache"

**Steps:**
1. Remove all cached summaries from storage
2. Confirm cleared

**When used:** After significant repo refactors where the cached summary is stale.

---

## Workflow Design Principles

- **Zero interruption**: Commands complete in the background where possible
- **Progressive disclosure**: Core value (search, record) accessible in 1-2 clicks
- **Graceful degradation**: No embeddings? Keyword search still works. No API key? Explain what to configure
- **Context preservation**: Memory always captures file/line context when invoked from editor
