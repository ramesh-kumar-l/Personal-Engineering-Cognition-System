# Local-First AI Tools: Privacy and Developer Trust

Subtitle: Why PECS keeps engineering cognition on the machine by default.

Tags: Local First Software, AI Tools, Privacy Engineering, Developer Experience, Electron

## AI Tools Need Trust Before They Need Features

Developers are asked to put more and more context into AI tools: source code,
design decisions, incidents, logs, traces, tickets, and conversations.

That context is exactly what makes AI useful. It is also exactly what makes AI
tools sensitive.

When I started building PECS, I did not want the default architecture to be:
"Send everything to a hosted service and hope the privacy policy is enough."

The design principle became:

> Local by default, networked by explicit choice.

## What PECS Stores Locally

PECS stores engineering memory on the user's machine:

- Debug sessions.
- Architecture decisions.
- Learnings.
- Incident notes.
- Repo summaries.
- Workflow definitions.
- Capability snapshots.

The VS Code extension uses VS Code global storage. The desktop app stores data
under `~/.pecs`.

The desktop app also creates a local API token in `~/.pecs/api-token`, which the
CLI and editor plugins use to authenticate against the local REST API.

## The Loopback API Boundary

PECS Desktop runs an Express API on:

```text
127.0.0.1:39457
```

The status route is public so tools can discover whether PECS is alive:

```text
GET /api/v1/status
```

Other routes require a bearer token:

```text
Authorization: Bearer <token>
```

This is not a replacement for enterprise security infrastructure. It is a
pragmatic local boundary for a developer tool that needs to integrate with a
CLI, editor plugins, and scripts without opening a remote service.

## Optional Network Paths

PECS can call the network, but the user has to choose that path.

Examples:

- Claude through the Anthropic SDK.
- OpenAI-compatible endpoints through raw fetch.
- Ollama on a local server.
- Voyage AI for embeddings.
- HTTP sync export/import.
- AI orchestration through a configured endpoint.
- Team relay push/pull flows.

This keeps the architecture honest. A user can run useful local workflows
without configuring a hosted AI provider.

## Why This Matters for Developer Experience

Privacy is not only a legal concern. It shapes whether developers will actually
use a tool.

If capturing memory feels risky, engineers will stop recording the most useful
details. They will write vague notes, avoid incident context, and strip out the
technical specifics that future search needs.

A local-first posture makes better product behavior possible:

- Developers can record precise notes.
- Search has richer data.
- AI prompts can be constructed intentionally.
- Sync and sharing can remain explicit actions.

## Implementation Decisions That Support Trust

Several boring choices make the system easier to inspect:

- JSON storage instead of an opaque remote backend.
- Zod schemas for runtime validation.
- A clear provider boundary for AI calls.
- A loopback-only desktop API.
- Token-protected API routes.
- No Python dependency layer for a TypeScript project.
- No hidden cloud requirement.

None of these decisions is flashy. Together, they make the product legible.

## The Tradeoff

Local-first systems still have costs:

- Sync is harder.
- Multi-device access is not automatic.
- Team sharing requires explicit relay flows.
- Local AI quality depends on user setup.

For a developer cognition tool, I think those tradeoffs are worthwhile. The
private context is the product's most valuable input.

## Closing

AI developer tools should earn trust at the architecture level, not only in
marketing copy. PECS is an experiment in making that trust visible in code.

GitHub repository: https://github.com/ramesh-kumar-l/Personal-Engineering-Cognition-System
