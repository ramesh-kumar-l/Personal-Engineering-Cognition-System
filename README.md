# PECS — Personal Engineering Cognition System

An AI-native engineering cognition OS. PECS enables engineers to store persistent engineering memory, retrieve contextual intelligence, orchestrate workflows, and integrate AI deeply into their development environment.

## What This Is

- Engineering cognition infrastructure
- Persistent memory platform
- Repo-aware AI assistance
- Workflow intelligence engine

## What This Is Not

- A generic notes app
- A simple AI chatbot wrapper
- A productivity dashboard

## Phase 1: VSCode Repo Cognition Engine

The first phase ships as a VSCode extension with:

- **Repo Summarization** — AI-generated architecture summaries with dependency mapping
- **Engineering Memory** — Record and retrieve debugging sessions, decisions, and learnings
- **Hybrid Search** — Keyword + semantic + temporal ranking across all memories
- **Onboarding Generation** — Auto-generated onboarding docs for any repository

## Architecture

```
┌─────────────────────────────────────────┐
│           VSCode Extension Host          │
│  ┌──────────┐  ┌─────────┐  ┌────────┐ │
│  │ Scanner  │  │ Storage │  │ Search │ │
│  └────┬─────┘  └────┬────┘  └───┬────┘ │
│       │              │           │      │
│  ┌────▼──────────────▼───────────▼────┐ │
│  │          AI Provider Layer          │ │
│  │  Claude | OpenAI-compat | Ollama   │ │
│  └────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│              Webview (sidebar)           │
└─────────────────────────────────────────┘
```

## Setup

```bash
cd extension
npm install
npm run build

# Development (F5 in VSCode opens Extension Development Host)
npm run watch

# Run tests
npm test

# Package
npm run package
```

## Configuration

In VSCode settings (`pecs.*`):

| Setting | Default | Description |
|---|---|---|
| `pecs.aiProvider` | `claude` | AI provider: `claude`, `openai-compat`, `ollama` |
| `pecs.claude.apiKey` | — | Anthropic API key (or `ANTHROPIC_API_KEY` env var) |
| `pecs.claude.model` | `claude-sonnet-4-5` | Claude model |
| `pecs.ollama.baseUrl` | `http://localhost:11434` | Ollama server URL |
| `pecs.ollama.model` | `llama3.2` | Ollama model |
| `pecs.scanner.maxFilesPerScan` | `500` | Max files to include in repo scan |
| `pecs.search.embeddingsEnabled` | `false` | Enable semantic search (requires embedding-capable provider) |

## Roadmap

- **Phase 1** (current): VSCode Repo Cognition Engine
- **Phase 2**: Persistent Engineering Memory (enhanced)
- **Phase 3**: Semantic Retrieval + Hybrid Search (advanced)
- **Phase 4**: Workflow Intelligence
- **Phase 5**: Capability Tracking
- **Phase 6**: Desktop Cognition OS
- **Phase 7**: AI Orchestration Layer

## License

Apache 2.0
