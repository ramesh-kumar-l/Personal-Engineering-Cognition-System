# PECS: Personal Engineering Cognition System

PECS is an AI-native engineering cognition system for developers who want their
engineering knowledge to compound over time. It captures decisions, debugging
sessions, workflows, repo summaries, and capability signals, then makes them
searchable across tools through a VS Code extension, desktop app, local API, and
CLI.

The project is local-first by design. Your engineering memory lives on your
machine unless you explicitly configure an AI provider, sync target, or team
relay.

## Why This Exists

Modern engineers solve complex problems, switch contexts constantly, and lose
valuable reasoning in chat windows, scratch files, ticket comments, and memory.
PECS treats that reasoning as durable engineering infrastructure.

It is not a generic notes app and not a chatbot wrapper. It is a portfolio-grade
system demonstrating product thinking, local-first architecture, typed storage,
search ranking, editor integration, desktop APIs, workflow orchestration, and
privacy-aware AI tooling.

## Core Features

| Feature | What it does |
| --- | --- |
| Repo summarization | Scans a repository and generates an architecture summary. |
| Engineering memory | Records debug sessions, decisions, learnings, incidents, and notes. |
| Hybrid search | Combines keyword search, semantic search, and temporal recency scoring. |
| Cross-workspace retrieval | Searches engineering memories across projects. |
| Memory provenance | Captures commit context and checks whether file-linked memories are stale. |
| Workflow intelligence | Stores and runs reusable engineering playbooks. |
| Capability tracking | Builds snapshots of technologies, workflows, and engineering exposure. |
| Desktop cognition layer | Runs an Electron app with a local REST API. |
| CLI | Provides headless memory, search, sync, synthesis, and workflow commands. |
| Editor plugin path | Documents a REST API contract and includes a Neovim prototype. |
| AI orchestration | Runs multi-agent workflows through configurable AI endpoints. |
| Team sharing | Supports self-hosted team memory relay flows. |

## Repository Layout

```text
.
|-- extension/             VS Code extension
|-- desktop/               Electron app and local REST API
|-- cli/                   Command-line client for the desktop API
|-- editor-plugins/        API spec and editor plugin prototypes
|-- project-memory-bank/   Product, architecture, roadmap, and design notes
|-- blogs/                 Medium-ready engineering article series
|-- DEPENDENCIES.md        Dependency and runtime guide
|-- QuickStarterGuide.md   First-15-minutes setup guide
|-- requirements.txt       Documents that no Python dependencies are required
```

## Architecture

```text
VS Code Extension
  |-- scanner: walks repos, parses dependencies, builds prompt context
  |-- storage: JSON-backed memories, summaries, workflows, capabilities
  |-- search: MiniSearch, embeddings, HNSW, rank fusion
  |-- providers: Claude, OpenAI-compatible APIs, Ollama, Voyage embeddings
  |-- webview: sidebar UI and message bridge

Desktop App
  |-- Electron shell
  |-- local REST API on 127.0.0.1:39457
  |-- desktop memory/search stores
  |-- sync, synthesis, orchestration, team relay routes

CLI and Editor Plugins
  |-- use the desktop API
  |-- read token from ~/.pecs/api-token or environment variables
```

Important boundaries:

- The VS Code webview is presentation only. Business logic stays in the extension host.
- AI calls go through provider interfaces rather than direct imports throughout the app.
- Storage is validated with Zod and written locally.
- Desktop API routes are token-protected except `/api/v1/status`.

## Requirements

Required:

- Node.js 22+
- npm
- Git
- VS Code 1.90+ for extension development

Optional:

- Ollama for local models
- Anthropic API key for Claude
- OpenAI-compatible endpoint for local or hosted models
- Voyage AI key for embeddings
- Electron packaging prerequisites for native installers

See [DEPENDENCIES.md](DEPENDENCIES.md) for the full dependency guide.

## Quick Start

Install, build, and test each package:

```bash
cd extension
npm install
npm run build
npm test

cd ../desktop
npm install
npm run build
npm test

cd ../cli
npm install
npm run build
npm test
```

For a guided walkthrough, read [QuickStarterGuide.md](QuickStarterGuide.md).
For a concrete first example with sample commands and expected output, read
[SAMPLE_USAGE.md](SAMPLE_USAGE.md).

## VS Code Extension

Run in development:

```bash
cd extension
npm install
npm run watch
```

Then press `F5` in VS Code to launch an Extension Development Host.

Useful commands from the Command Palette:

| Command | Purpose |
| --- | --- |
| `PECS: Summarize Repository Architecture` | Generate a repo architecture summary. |
| `PECS: Record Engineering Memory` | Store a decision, debug note, incident, learning, or note. |
| `PECS: Search Engineering Memory` | Search memories in the active workspace. |
| `PECS: Generate Onboarding Document` | Generate onboarding material for the current repo. |
| `PECS: Search All Workspaces` | Run cross-workspace memory retrieval. |
| `PECS: Create Workflow` | Define a reusable engineering workflow. |
| `PECS: Run Workflow` | Execute a stored workflow. |
| `PECS: Track Capabilities` | Capture a capability snapshot. |
| `PECS: View Capability Report` | Render capability signals in the sidebar. |

Package the extension:

```bash
cd extension
npm run package
```

## AI Provider Configuration

Settings are under the `pecs.*` namespace in VS Code.

Common options:

| Setting | Default | Purpose |
| --- | --- | --- |
| `pecs.aiProvider` | `claude` | `claude`, `openai-compat`, or `ollama`. |
| `pecs.claude.apiKey` | empty | Claude API key, or use `ANTHROPIC_API_KEY`. |
| `pecs.claude.model` | `claude-sonnet-4-5` | Claude model name. |
| `pecs.openaiCompat.baseUrl` | `http://localhost:1234/v1` | OpenAI-compatible API base URL. |
| `pecs.openaiCompat.model` | `gpt-4o` | OpenAI-compatible model name. |
| `pecs.ollama.baseUrl` | `http://localhost:11434` | Ollama server URL. |
| `pecs.ollama.model` | `llama3.2` | Ollama completion model. |
| `pecs.ollama.embeddingModel` | `nomic-embed-text` | Ollama embedding model. |
| `pecs.search.embeddingsEnabled` | `false` | Enables semantic search when embeddings are available. |
| `pecs.voyage.apiKey` | empty | Voyage AI embedding key. |
| `pecs.voyage.model` | `voyage-3-lite` | Voyage embedding model. |

## Desktop App and Local API

Run desktop:

```bash
cd desktop
npm install
npm run build
npm start
```

The API listens on `http://127.0.0.1:39457` by default.

Health check:

```bash
curl http://127.0.0.1:39457/api/v1/status
```

Protected routes require:

```text
Authorization: Bearer <token from ~/.pecs/api-token>
```

Main route groups:

| Route group | Purpose |
| --- | --- |
| `/api/v1/status` | Health check, no auth required. |
| `/api/v1/memories` | Create, list, search, fetch, and delete memories. |
| `/api/v1/capabilities` | Read capability snapshots. |
| `/api/v1/sync` | Export and import memories through remote HTTP endpoints. |
| `/api/v1/orchestration` | Run multi-agent workflows with AI endpoints. |
| `/api/v1/synthesis` | Synthesize insights across memories. |
| `/api/v1/team` | Start relay, push, and pull team memory. |

The REST contract for editor integrations is documented in
`editor-plugins/spec/api.md`.

## CLI

Build:

```bash
cd cli
npm install
npm run build
```

Examples:

```bash
node dist/index.js status
node dist/index.js record --title "Switched auth strategy" --content "JWTs replaced session cookies for mobile support." --type decision --tags auth,backend
node dist/index.js search "auth strategy" --limit 5
node dist/index.js sync export https://example.com/pecs-backup
node dist/index.js workflow synthesize --endpoint http://localhost:1234/v1/chat/completions --model local-model
```

Environment variables:

| Variable | Purpose |
| --- | --- |
| `PECS_PORT` | Desktop API port, default `39457`. |
| `PECS_TOKEN` | API token value. |
| `PECS_TOKEN_FILE` | Custom path to token file. |
| `PECS_AI_KEY` | Optional key for CLI workflow AI calls. |

## Development Workflow

Typical loop:

```bash
cd extension
npm run build
npm test

cd ../desktop
npm run build
npm test

cd ../cli
npm run build
npm test
```

Project conventions:

- Source is TypeScript.
- Runtime validation uses Zod.
- Bundling uses esbuild.
- Tests use Vitest.
- Generated directories such as `node_modules/`, `dist/`, `out/`, and release artifacts are not source.

## Testing

| Package | Command |
| --- | --- |
| Extension | `cd extension && npm test` |
| Desktop | `cd desktop && npm test` |
| CLI | `cd cli && npm test` |

Manual checks:

- Run the extension in an Extension Development Host.
- Record a memory, search it, and open the sidebar.
- Start desktop and call `/api/v1/status`.
- Run `node cli/dist/index.js status` while desktop is running.

## Security and Privacy

PECS is local-first:

- Memories and summaries are stored locally.
- The desktop API binds to loopback by default.
- API routes require a bearer token except status.
- AI providers are called only when configured and invoked.
- Optional sync and team relay features are explicit user actions.

Never commit:

- API keys
- `.env` files
- `~/.pecs/api-token`
- Generated installers
- `node_modules/`
- `dist/`

## Troubleshooting

| Symptom | Likely fix |
| --- | --- |
| Desktop API unreachable | Start desktop with `cd desktop && npm start`. |
| CLI receives `HTTP 401` | Check `~/.pecs/api-token` or set `PECS_TOKEN`. |
| Port conflict on `39457` | Set `PECS_PORT` consistently for desktop and CLI. |
| Extension AI command fails | Configure a provider under `pecs.*`. |
| Semantic search has no signal | Enable embeddings and use an embedding-capable provider. |
| VS Code commands missing | Launch the Extension Development Host or install the packaged `.vsix`. |

## Roadmap Snapshot

Implemented areas include:

- VS Code repo cognition engine
- Persistent engineering memory
- Semantic retrieval and hybrid search
- Workflow intelligence
- Capability tracking
- Desktop cognition OS
- CLI and editor integration path
- AI orchestration, synthesis, and team sharing routes

The project memory bank in `project-memory-bank/` contains design intent,
architecture notes, domain models, testing strategy, security notes, and risks.

## FAQ

### Is this a Python project?

No. `requirements.txt` exists only to clarify that there are no Python runtime
dependencies. PECS is TypeScript and Node.js.

### Does PECS require cloud services?

No. Local storage and local search work without cloud services. AI providers,
cloud sync, and team sharing are optional.

### Where is data stored?

The VS Code extension stores data through VS Code global storage. The desktop
app stores data under `~/.pecs`.

### Can I use local models?

Yes. Ollama and OpenAI-compatible local endpoints are supported.

### Why JSON storage instead of SQLite?

The current design avoids native modules and Electron ABI friction. Zod
validation and versioned schemas keep the flat-file format migration-friendly.

### What makes this useful as an engineering portfolio project?

It shows product sense and implementation depth across editor extensions,
desktop apps, local APIs, AI provider abstraction, search ranking, schema
validation, workflow execution, and privacy boundaries.

## Contributing

Good first contributions:

- Improve setup documentation after validating on a new machine.
- Add tests around storage, search, ranking, or API routes.
- Expand editor plugin integrations.
- Improve provider error messages.
- Add examples for common workflows.

Before opening a PR, run the relevant package build and tests.

## License

Apache License 2.0. See [LICENSE](LICENSE).
