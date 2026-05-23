# Tech Stack

## Language

**TypeScript 5.8** with strict mode.

All source files are `.ts`. No JavaScript in `src/`. The webview UI is also TypeScript — compiled separately by esbuild into an IIFE bundle.

## Extension Runtime

**VSCode Extension Host (Node.js 22)**

VSCode 1.90+ ships with Node 22. The extension bundle targets `node22` in esbuild. CommonJS output format — VSCode extension host does not support native ES modules.

## Bundler

**esbuild 0.28**

Two entry points:
- `src/extension.ts` → `dist/extension.js` (CJS, platform: node)
- `src/webview/webview-ui/main.ts` → `dist/webview.js` (IIFE, platform: browser)

`vscode` is always external — provided by the host at runtime.

esbuild chosen over webpack for speed (50ms vs 5s builds) and simplicity (no loaders needed).

## Testing

**Vitest 3**

Unit tests mock the `vscode` module. No Electron process required. Test files live in `test/unit/`. Integration/E2E testing uses the F5 Extension Development Host.

## Storage

**JSON flat-file** at `context.globalStorageUri.fsPath/pecs-db.json`

Atomic writes: write to `.tmp` → rename. Debounced flush (2000ms). No native modules. No SQLite. Migration-friendly: `version: 1` field allows future schema changes.

## Search

**MiniSearch 7** for keyword search (fuzzy + prefix, TF-IDF based).
**Cosine similarity** (O(n)) for semantic search over stored embedding vectors.

## AI Providers

| Provider | SDK / Method | Embedding Support |
|---|---|---|
| Claude (Anthropic) | `@anthropic-ai/sdk` | No (throws, degrades gracefully) |
| OpenAI-compat | Raw `fetch` (Node 22 built-in) | Yes (`/embeddings` endpoint) |
| Ollama | `ollama` npm package | Yes (`/api/embeddings`) |

## Validation

**Zod 3** for runtime schema validation. All data entering/leaving storage is validated through Zod schemas. TypeScript types are inferred from schemas — no duplication.

## Key Dependencies

| Package | Purpose |
|---|---|
| `@anthropic-ai/sdk` | Claude API |
| `ollama` | Ollama local LLM API |
| `minisearch` | Full-text keyword search |
| `zod` | Schema validation + TS type inference |
| `ignore` | .gitignore-aware path filtering |
| `glob` | File system traversal |
| `uuid` | Deterministic UUIDs for memory IDs |

## Explicitly Not Used

- **SQLite / better-sqlite3**: Native module, breaks on Electron ABI changes
- **React / Svelte**: Overkill for Phase 1 webview; adds ~140KB and a separate build pipeline
- **openai npm package**: 2MB+; OpenAI-compat uses raw fetch instead
- **webpack**: Slower and more complex than esbuild for this use case
- **prisma / drizzle**: ORM is not needed for JSON flat-file storage
