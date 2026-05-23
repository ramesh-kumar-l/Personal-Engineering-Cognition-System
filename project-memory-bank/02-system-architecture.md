# System Architecture

## Layer Diagram

```
┌──────────────────────────────────────────────────────────┐
│                   VSCode Extension Host (Node.js)         │
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │   Scanner   │  │   Storage    │  │     Search     │  │
│  │             │  │              │  │                │  │
│  │ FileWalker  │  │StorageManager│  │ SearchEngine   │  │
│  │ DepParser   │  │ MemoryStore  │  │ KeywordIndex   │  │
│  │CtxBuilder   │  │ SummaryCache │  │ EmbeddingIndex │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘  │
│         │                │                   │           │
│  ┌──────▼────────────────▼───────────────────▼────────┐  │
│  │                   AI Provider Layer                  │  │
│  │         interface AIProvider { complete, embed }     │  │
│  │  ┌────────────┐ ┌─────────────────┐ ┌───────────┐  │  │
│  │  │   Claude   │ │ OpenAI-compat   │ │  Ollama   │  │  │
│  │  │ (no embed) │ │ (fetch-based)   │ │ (embed ✓) │  │  │
│  │  └────────────┘ └─────────────────┘ └───────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                    Commands                          │  │
│  │  summarizeRepo | searchMemory | generateOnboarding   │  │
│  │  recordMemory  | clearCache                          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              PecsPanel (WebviewViewProvider)         │  │
│  │              message bridge: postMessage / onMessage │  │
│  └───────────────────────────┬─────────────────────────┘  │
└──────────────────────────────┼────────────────────────────┘
                               │ CSP-sandboxed iframe
┌──────────────────────────────▼────────────────────────────┐
│                 Webview (browser sandbox)                  │
│          vanilla TypeScript, acquireVsCodeApi()            │
│          search input | results list | summary view        │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                  Local Storage (JSON)                       │
│         context.globalStorageUri.fsPath/pecs-db.json       │
│         { version, memories[], summaries{}, searchIndex }  │
└────────────────────────────────────────────────────────────┘
```

## Key Boundaries

### Extension Host / Webview Boundary

The extension host runs in Node.js with full filesystem and network access. The webview runs in a CSP-sandboxed iframe. Communication is strictly via `postMessage` / `onDidReceiveMessage`. All business logic lives in the extension host — the webview is a pure presentation layer.

### AI Provider Boundary

The `AIProvider` interface is the only dependency boundary for AI calls. All modules that need AI (Scanner, commands) receive a provider instance via constructor injection — they never import a concrete provider class.

### Storage Boundary

`StorageManager` owns all disk I/O. Other modules receive `MemoryStore` or `SummaryCache` instances, never the raw file path. This makes testing straightforward: inject a mock `StorageManager`.

## Data Flow: Repo Summarization

```
User runs pecs.summarizeRepo
  → SummaryCache.get(workspaceId) → cache hit? return cached
  → FileWalker.walk(rootPath) → WalkedFile[]
  → DependencyParser.parse(rootPath) → Dependencies
  → ContextBuilder.build(files, deps, 80_000) → promptContext string
  → provider.complete({ messages: [{ role: 'user', content: promptContext }] })
  → RepoSummary
  → SummaryCache.set(workspaceId, summary)
  → PecsPanel.postMessage({ type: 'repoSummary', payload: summary })
```

## Data Flow: Memory Search

```
User types in search box
  → webview postMessage({ type: 'search', query })
  → extension onDidReceiveMessage → SearchEngine.query(q)
  → KeywordIndex.search(q) → keyword hits
  → (if embeddingsEnabled) provider.embed(q) → vector
    → EmbeddingIndex.search(vector) → semantic hits
  → Ranker.merge(keyword, semantic) → SearchResult[]
  → PecsPanel.postMessage({ type: 'searchResults', payload: results })
```
