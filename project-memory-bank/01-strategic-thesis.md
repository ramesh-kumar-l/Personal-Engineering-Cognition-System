# Strategic Thesis

## The Problem

Engineering knowledge is ephemeral. Debugging sessions, architectural decisions, and hard-won learnings live in engineers' heads, Slack threads, and PR descriptions — none of which are retrievable when you need them six months later.

AI assistants (Copilot, ChatGPT, Claude) are stateless. They know nothing about your specific codebase, your team's decisions, or why something was built the way it was. Every session starts from zero.

## The Thesis

Engineering cognition infrastructure that:
1. Persists knowledge at the moment it's generated (not as a separate journaling task)
2. Retrieves it contextually (not search-and-read, but answer-your-question)
3. Understands your actual codebase (not generic programming knowledge)
4. Compounds over time (the system gets smarter as you use it)

...creates an unfair advantage for the engineers and teams that adopt it early.

## Differentiation

| Tool | What it does | What PECS does differently |
|---|---|---|
| GitHub Copilot | Code completion | Persistent memory + repo cognition |
| Notion/Obsidian | Notes | Auto-capture + contextual retrieval |
| ChatGPT/Claude | General AI | Repo-aware, memory-grounded responses |
| SourceGraph | Code search | Engineering memory + AI synthesis |

## Why Local-First

- Privacy: engineering memory contains sensitive IP
- Reliability: works offline, in air-gapped environments
- Performance: no round-trip latency for retrieval
- Ownership: your data does not fund someone else's model training

## Provider Pluggability Rationale

Anthropic, OpenAI, and Ollama will all change pricing, capabilities, and APIs. A pluggable provider layer means PECS survives any single provider's decisions. Local LLMs via Ollama ensure PECS works forever, even if all cloud providers change their terms.
