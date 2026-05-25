# PECS Dependency Guide

PECS is a TypeScript and Node.js project. It does not require Python packages.
The source of truth for installable dependencies is each package's
`package.json` and `package-lock.json`.

## Required Tools

| Tool | Required for | Notes |
| --- | --- | --- |
| Node.js 22+ | All packages | The VS Code extension target is Node 22. |
| npm | Dependency installation and scripts | Use the lockfiles committed in each package. |
| Git | Development, provenance tracking, staleness checks | Some memory features capture commit hashes. |
| VS Code 1.90+ | Extension development and testing | Declared in `extension/package.json`. |

## Optional Tools and Services

| Tool or service | Used by | Notes |
| --- | --- | --- |
| Anthropic API key | VS Code extension AI provider | Configure `pecs.claude.apiKey` or `ANTHROPIC_API_KEY`. |
| OpenAI-compatible endpoint | VS Code extension, CLI workflow commands | Works with local or hosted compatible APIs. |
| Ollama | Local completion and embedding provider | Default local URL is `http://localhost:11434`. |
| Voyage AI key | High-quality embeddings | Configure `pecs.voyage.apiKey`. |
| Electron packaging prerequisites | Desktop distribution builds | Needed only for `desktop npm run dist`. |
| Neovim | Editor plugin integration | Uses the desktop REST API. |

## Package Dependencies

### VS Code Extension: `extension/`

Purpose: repo cognition, persistent engineering memory, search, workflow intelligence,
capability tracking, and the VS Code sidebar.

Runtime dependencies:

| Package | Purpose |
| --- | --- |
| `@anthropic-ai/sdk` | Claude provider integration. |
| `ollama` | Local Ollama model and embedding integration. |
| `minisearch` | Keyword search over memories. |
| `zod` | Runtime schema validation and inferred TypeScript types. |
| `ignore` | `.gitignore` aware scanning. |
| `glob` | File discovery. |
| `uuid` | Stable identifiers for memories and workflows. |

Development dependencies include TypeScript, esbuild, Vitest, ESLint, VS Code
extension types, and `@vscode/vsce` for packaging.

Commands:

```bash
cd extension
npm install
npm run build
npm test
npm run watch
npm run package
```

### Desktop App and API: `desktop/`

Purpose: always-available Electron app, system tray process, local REST API,
desktop storage, sync, orchestration, synthesis, and team sharing routes.

Runtime dependencies:

| Package | Purpose |
| --- | --- |
| `express` | Local REST API server. |
| `minisearch` | Desktop memory search. |
| `zod` | Request and storage validation. |
| `uuid` | IDs for persisted entities. |

Development dependencies include Electron, electron-builder, TypeScript,
esbuild, Vitest, Supertest, and Node/Express types.

Commands:

```bash
cd desktop
npm install
npm run build
npm test
npm start
npm run dist
```

The desktop API listens on `127.0.0.1:39457` by default. Override with
`PECS_PORT`.

### CLI: `cli/`

Purpose: headless access to the desktop API from a terminal or scripts.

Runtime dependencies:

| Package | Purpose |
| --- | --- |
| `commander` | CLI command parsing. |

Development dependencies include TypeScript, esbuild, Vitest, and Node types.

Commands:

```bash
cd cli
npm install
npm run build
npm test
node dist/index.js status
```

The CLI reads the desktop API token from `~/.pecs/api-token` by default.
You can also set `PECS_TOKEN`, `PECS_TOKEN_FILE`, and `PECS_PORT`.

### Editor Plugins: `editor-plugins/`

Purpose: document and prototype editor integrations that talk to PECS Desktop.

Current contents:

| Path | Purpose |
| --- | --- |
| `editor-plugins/spec/api.md` | REST API contract for editor integrations. |
| `editor-plugins/neovim/pecs.lua` | Neovim plugin prototype. |

The editor plugins depend on the desktop API being reachable at
`http://127.0.0.1:39457`.

## Local Storage and Ports

| Component | Location or port | Notes |
| --- | --- | --- |
| VS Code extension storage | VS Code global storage URI | Stores `pecs-db.json` through `StorageManager`. |
| Desktop storage | `~/.pecs` | Stores memories, API token, and desktop data. |
| Desktop API | `127.0.0.1:39457` | Public status route, token-protected API routes. |
| Team relay | `39458` by default | Started only when requested through team routes. |

## Privacy Boundary

PECS is designed as a local-first engineering cognition system. Data is stored
locally by default. Network calls happen only when a user configures or invokes
an AI provider, sync endpoint, orchestration endpoint, or team relay.

Do not commit real API keys, `~/.pecs/api-token`, `.env` files, generated
desktop releases, `dist/`, or `node_modules/`.

