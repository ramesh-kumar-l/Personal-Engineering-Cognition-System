# Testing Strategy

## Unit Tests (Vitest)

Run without VSCode, no Electron process required. The `vscode` module is mocked via `vitest.config.ts`.

**What is unit tested:**

| Module | What to test |
|---|---|
| `StorageManager` | load/flush, atomic write, validation failure recovery |
| `MemoryStore` | CRUD operations, workspaceId filtering |
| `SummaryCache` | TTL expiry, cache hit/miss |
| `FileWalker` | gitignore filtering, priority sorting, file count limit |
| `DependencyParser` | package.json, pyproject.toml, go.mod parsing |
| `ContextBuilder` | char budget enforcement, output format |
| `KeywordIndex` | fuzzy search, prefix search, reindex |
| `EmbeddingIndex` | cosine similarity correctness, top-k ordering |
| `Ranker` | score fusion formula, temporal decay |
| `SearchEngine` | keyword-only mode, hybrid mode, filter by workspaceId |
| `ClaudeProvider` | maps Anthropic errors to AIProviderError codes |
| `OpenAICompatProvider` | request format, timeout handling |
| `OllamaProvider` | embedding support detection |

**What is NOT unit tested:**
- `extension.ts` (activation wiring — E2E)
- `PecsPanel.ts` (webview lifecycle — E2E)
- Command handlers (thin wrappers — E2E)

## Mocking Strategy

### `vscode` module mock

```typescript
// test/__mocks__/vscode.ts
export const workspace = {
  getConfiguration: vi.fn(() => ({ get: vi.fn() })),
  workspaceFolders: [],
};
export const window = {
  showErrorMessage: vi.fn(),
  showInformationMessage: vi.fn(),
  withProgress: vi.fn(),
};
export const Uri = {
  joinPath: vi.fn(),
  file: vi.fn(),
};
// ... etc
```

### AI Provider mock

```typescript
const mockProvider: AIProvider = {
  name: 'mock',
  complete: vi.fn().mockResolvedValue({ text: 'mock response' }),
  completeStream: vi.fn(),
  isAvailable: vi.fn().mockResolvedValue(true),
};
```

### Storage mock

```typescript
const mockStorage = {
  get: vi.fn().mockResolvedValue({ version: 1, memories: [], summaries: {} }),
  scheduleFlush: vi.fn(),
};
```

## E2E Verification (Manual)

Run via F5 in VSCode (Extension Development Host):

1. Extension activates without errors (check Output → PECS channel)
2. `pecs.summarizeRepo` command runs and populates sidebar
3. `pecs.recordMemory` saves a memory, `pecs.searchMemory` retrieves it
4. Config change (switch provider) invalidates provider without restart
5. `.vsix` installs via `code --install-extension pecs-0.1.0.vsix`

## Test Commands

```bash
cd extension
npm test          # run all unit tests once
npm run test:watch  # watch mode
```
