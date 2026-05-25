# PECS Quick Starter Guide

This guide gets a first-time engineer from clone to a working local build.

## 1. What You Are Running

PECS is a local-first engineering cognition system with three main surfaces:

| Surface | Folder | What it does |
| --- | --- | --- |
| VS Code extension | `extension/` | Repo summaries, memory capture, search, workflows, capability reports. |
| Desktop app | `desktop/` | Electron app plus local REST API on `127.0.0.1:39457`. |
| CLI | `cli/` | Terminal client for search, record, sync, and AI workflows. |

There are no Python dependencies. Use npm in each package directory.

## 2. Prerequisites

Install:

- Node.js 22 or newer
- npm
- Git
- VS Code 1.90 or newer

Optional:

- Ollama for local models
- Anthropic API key for Claude
- OpenAI-compatible local or hosted endpoint
- Voyage AI key for embeddings

## 3. Install Everything

From the repository root:

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

## 4. Run the VS Code Extension

1. Open the repository in VS Code.
2. Open the `extension/` folder context if needed.
3. Run `npm run watch` inside `extension/`.
4. Press `F5` in VS Code to launch an Extension Development Host.
5. In the new VS Code window, open the Command Palette and run:
   - `PECS: Summarize Repository Architecture`
   - `PECS: Record Engineering Memory`
   - `PECS: Search Engineering Memory`
   - `PECS: Generate Onboarding Document`

The PECS sidebar appears in the activity bar.

## 5. Configure an AI Provider

Open VS Code settings and search for `pecs`.

Common local setup:

```text
pecs.aiProvider = ollama
pecs.ollama.baseUrl = http://localhost:11434
pecs.ollama.model = llama3.2
pecs.ollama.embeddingModel = nomic-embed-text
pecs.search.embeddingsEnabled = true
```

Claude setup:

```text
pecs.aiProvider = claude
pecs.claude.apiKey = <your key>
pecs.claude.model = claude-sonnet-4-5
```

OpenAI-compatible setup:

```text
pecs.aiProvider = openai-compat
pecs.openaiCompat.baseUrl = http://localhost:1234/v1
pecs.openaiCompat.model = gpt-4o
pecs.openaiCompat.apiKey = <optional key>
```

For Voyage embeddings:

```text
pecs.voyage.apiKey = <your key>
pecs.voyage.model = voyage-3-lite
```

## 6. Run the Desktop App

```bash
cd desktop
npm run build
npm start
```

The desktop app starts a local API on:

```text
http://127.0.0.1:39457
```

Check health:

```bash
curl http://127.0.0.1:39457/api/v1/status
```

The status route does not require authentication. Other routes require:

```text
Authorization: Bearer <token from ~/.pecs/api-token>
```

## 7. Use the CLI

Build the CLI:

```bash
cd cli
npm run build
```

Check desktop connectivity:

```bash
node dist/index.js status
```

Record a memory:

```bash
node dist/index.js record --title "Debugged API auth" --content "Token lookup failed because PECS_TOKEN_FILE pointed at an old path." --type debug --tags api,auth
```

Search memories:

```bash
node dist/index.js search "api auth" --limit 5
```

Run AI synthesis through the desktop API:

```bash
node dist/index.js workflow synthesize --endpoint http://localhost:1234/v1/chat/completions --model local-model
```

Useful environment variables:

```bash
PECS_PORT=39457
PECS_TOKEN=<token>
PECS_TOKEN_FILE=<path-to-token-file>
PECS_AI_KEY=<ai-provider-key>
```

## 8. Troubleshooting

| Problem | Fix |
| --- | --- |
| `PECS Desktop is not running or unreachable` | Start the desktop app with `cd desktop && npm start`. |
| CLI gets `HTTP 401` | Confirm `~/.pecs/api-token` exists or set `PECS_TOKEN`. |
| Port `39457` is busy | Set `PECS_PORT` before starting desktop and CLI. |
| Extension cannot call Claude | Set `pecs.claude.apiKey` or `ANTHROPIC_API_KEY`. |
| Ollama calls fail | Start Ollama and pull the configured model. |
| Semantic search is empty | Enable embeddings and record memories after configuring an embedding provider. |
| VS Code extension commands do not appear | Run the extension through the Extension Development Host or package/install the `.vsix`. |

## 9. First Good Contribution

Good starting points:

- Improve README examples after running the project.
- Add tests around a storage, search, or API edge case.
- Expand editor plugin docs.
- Validate setup on macOS or Linux and document differences.

