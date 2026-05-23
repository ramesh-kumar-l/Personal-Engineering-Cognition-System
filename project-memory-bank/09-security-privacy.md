# Security & Privacy

## Principles

1. **Local-first** — all data stored on the user's machine by default
2. **No telemetry** — PECS sends zero analytics, crash reports, or usage data
3. **Explicit AI calls only** — AI providers are called only when the user explicitly triggers a command
4. **No API key storage in plaintext** — keys read from VSCode SecretStorage or env vars

## API Key Handling

API keys are read in this priority order:
1. `vscode.workspace.getConfiguration('pecs').get('claude.apiKey')` — VSCode settings (stored encrypted by VSCode)
2. `process.env.ANTHROPIC_API_KEY` — environment variable
3. If neither: show `vscode.window.showInputBox` with `password: true`, store in `context.secrets`

**Never** hardcode API keys. **Never** log API keys. **Never** include API keys in error messages.

```typescript
// Correct pattern in ClaudeProvider
const apiKey = config.get<string>('claude.apiKey')
  || process.env['ANTHROPIC_API_KEY']
  || await context.secrets.get('pecs.claude.apiKey')
  || '';
```

## Data Stored Locally

`pecs-db.json` contains:
- Memory titles and content (user-written)
- Repo summaries (AI-generated from user's codebase)
- Embedding vectors (numerical, not human-readable)

This file may contain sensitive information (internal architecture, proprietary code snippets). It is stored in VSCode's `globalStorageUri`, which is outside the workspace and not checked into git by default.

## Webview Security

The webview enforces a strict Content-Security-Policy:
```
default-src 'none';
script-src 'nonce-{random}';
style-src {webview.cspSource} 'unsafe-inline';
```

- No inline scripts (nonce required)
- No external network access from webview
- Scripts loaded only from `dist/webview.js` via `vscode-resource:` URI

## What Leaves the Machine

The only data that leaves the machine is what the AI provider receives during explicit user-triggered commands:
- Repository file contents (truncated to context budget) — sent to AI provider during summarize/onboarding
- Memory content — sent to AI provider only if semantic search is active (for embedding generation)
- Search queries — sent to AI provider only if semantic search is active (for embedding generation)

The user's chosen AI provider handles this data under their own privacy policy.

## Threat Model

| Threat | Mitigation |
|---|---|
| API key leakage | SecretStorage or env vars, never logged |
| Malicious workspace files | FileWalker reads files as text, never executes them |
| Prompt injection via repo content | AI outputs are displayed as text, never eval'd |
| Storage corruption | Atomic writes (tmp → rename), Zod validation on load |
| Webview XSS | Strict CSP with nonce, no innerHTML with user content |
