# Coding Standards

## Module Conventions

- Each module is a class or a set of exported functions — no globals
- Modules receive dependencies via constructor injection (not imported directly)
- The `vscode` module is only imported in: `extension.ts`, command handlers, `PecsPanel.ts`, `StorageManager.ts`, `config.ts`, `logger.ts`
- Business logic modules (search, storage, scanner) have zero `vscode` imports — enables Vitest unit testing

## File Naming

- `PascalCase.ts` for classes (e.g., `StorageManager.ts`, `RepoScanner.ts`)
- `camelCase.ts` for non-class modules (e.g., `schema.ts`, `config.ts`)
- `kebab-case` for webview UI files (e.g., `main.ts`, `styles.css`)

## Error Handling

- All `AIProvider` errors are caught and rethrown as `AIProviderError` with typed codes
- Command handlers show user-facing errors via `vscode.window.showErrorMessage()`
- Storage errors are fatal (logged + extension deactivated gracefully)
- Search errors are non-fatal (empty results returned, error logged)
- Never swallow errors silently

## TypeScript Rules

- `strict: true` — no escape hatches
- No `any` — use `unknown` + type guards when necessary
- All function parameters and return types explicitly annotated
- Zod schemas are the source of truth for runtime types — `z.infer<typeof Schema>` not hand-written interfaces

## Comments

- No comments explaining what code does — names should be self-explanatory
- Comments only for non-obvious WHY: hidden constraints, workarounds, subtle invariants

## Imports

- No barrel files (`index.ts` re-exports) — import directly from source files
- `vscode` imports are always `import * as vscode from 'vscode'` (namespace import)
- Third-party imports before local imports, separated by blank line

## Async Patterns

- All I/O is `async/await` — no callbacks
- No `Promise.all` without error handling for partial failure
- `AsyncGenerator` for streaming AI responses

## Testing Patterns

- Unit tests mock `vscode` module globally (see `vitest.config.ts`)
- Test files live in `test/unit/`, named `<module>.test.ts`
- No testing implementation details — test observable behavior
- Fixture files in `test/fixtures/`
