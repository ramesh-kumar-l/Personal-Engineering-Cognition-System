# Hybrid Search for Engineering Memory: Keyword, Semantic, and Time

Subtitle: Why PECS combines lexical matching, embeddings, and recency scoring.

Tags: Search, Embeddings, TypeScript, Developer Tools, AI Engineering

## Engineering Search Is Not One Problem

Searching personal engineering memory is different from searching documents on
the public web.

Sometimes you remember the exact word:

> "Find the note about JWT rotation."

Sometimes you remember the concept:

> "Find the debugging session where auth failed because the token source was wrong."

Sometimes recency matters:

> "Show me the latest thing I learned about Electron packaging."

A useful engineering memory system needs all three signals.

## The PECS Search Model

PECS combines:

- Keyword search through MiniSearch.
- Semantic search through embeddings.
- Temporal scoring based on memory age.
- Rank fusion to produce a final result list.

Keyword search is fast and precise. Semantic search catches conceptual matches.
Temporal scoring keeps recent work from being buried by old notes with strong
text overlap.

## Keyword Search

MiniSearch gives PECS a compact, TypeScript-friendly full-text index.

It supports the practical behavior developers expect:

- Prefix matches.
- Fuzzy matches.
- Fast local results.
- No external search service.

This is important because not every query needs embeddings. If I search for a
specific function name, file path, package, or error string, lexical matching is
usually the strongest signal.

## Semantic Search

Semantic search helps when the query and memory use different words for the same
idea.

PECS supports embedding providers through a provider boundary. Depending on
configuration, embeddings can come from:

- Ollama.
- OpenAI-compatible APIs.
- Voyage AI.

The project includes a pure TypeScript HNSW index for approximate nearest
neighbor search. That keeps the implementation portable and avoids native module
friction in extension and desktop environments.

## Temporal Scoring

Engineering memory ages.

Some decisions are durable. Some debugging notes are useful for a week. Some
incident details become stale as the system changes.

PECS includes temporal ranking so the final score can reflect recency. The
half-life is configurable through:

```text
pecs.search.temporalHalfLifeDays
```

The point is not to blindly prefer new memories. The point is to make recency a
visible signal alongside keyword and semantic relevance.

## Staleness and Provenance

Search quality also depends on whether a memory is still valid.

PECS records commit context and supports staleness checks for file-linked
memories. If a memory points to a file that moved or changed significantly, the
system can mark that memory as stale or unknown.

That is a subtle but important product detail. Engineering memory is not just
text. It is text connected to a changing codebase.

## Lessons Learned

The biggest lesson is that AI search should not replace classic search. It
should complement it.

Exact identifiers still matter:

- Error codes.
- Function names.
- File paths.
- Package names.
- Ticket IDs.

Embeddings help with fuzzy human language. Keyword search helps with precise
engineering language. Temporal scoring helps with the reality that software
changes.

## Closing

Hybrid search is one of the core reasons PECS feels like an engineering tool
rather than a generic note app. The system respects how developers actually
remember things: sometimes exact, sometimes conceptual, often time-sensitive.

GitHub repository: https://github.com/ramesh-kumar-l/Personal-Engineering-Cognition-System
