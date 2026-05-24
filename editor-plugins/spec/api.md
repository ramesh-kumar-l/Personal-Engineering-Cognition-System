# PECS Desktop REST API Specification

**Base URL:** `http://127.0.0.1:39457`  
**Auth:** Bearer token from `~/.pecs/api-token` (all routes except `/api/v1/status`)  
**Content-Type:** `application/json`

---

## Authentication

```
Authorization: Bearer <token>
```

Read `~/.pecs/api-token` to retrieve the token. File is created automatically on first launch of PECS Desktop.

---

## Endpoints

### `GET /api/v1/status`

Health check — no auth required.

**Response 200:**
```json
{
  "version": "0.6.0",
  "status": "running",
  "uptime": 3600,
  "memoryCount": 42
}
```

---

### `GET /api/v1/memories`

List all memories, optionally filtered by workspace.

**Query params:**
- `workspace` _(optional)_ — filter by workspaceId

**Response 200:** Array of `Memory` objects.

---

### `GET /api/v1/memories/search?q=<query>`

Full-text keyword search over memories with temporal recency scoring.

**Query params:**
- `q` _(required)_ — search query
- `workspace` _(optional)_ — restrict to a single workspace
- `limit` _(optional, default 20, max 100)_ — max results to return

**Response 200:**
```json
[
  {
    "id": "uuid",
    "type": "memory",
    "title": "Switched to Vite",
    "excerpt": "Moved from Webpack due to slow HMR...",
    "score": 0.87,
    "keywordScore": 0.92,
    "temporalScore": 0.81,
    "createdAt": "2026-05-20T10:30:00.000Z",
    "memoryType": "decision",
    "workspaceId": "my-project"
  }
]
```

---

### `POST /api/v1/memories`

Record a new engineering memory.

**Request body:**
```json
{
  "workspaceId": "my-project",
  "type": "note",
  "title": "Switched auth to JWT",
  "content": "Replaced session cookies with JWTs to support mobile clients",
  "tags": ["auth", "backend"],
  "filePath": "src/auth/handler.ts"
}
```

Fields:
- `workspaceId` _(string, default "desktop")_
- `type` _(enum: debug | decision | learning | incident | note, default "note")_
- `title` _(string, required)_
- `content` _(string, required)_
- `tags` _(string[], default [])_
- `filePath` _(string, optional)_

**Response 201:** Created `Memory` object.

---

### `GET /api/v1/memories/:id`

Get a single memory by ID.

**Response 200:** `Memory` object.  
**Response 404:** `{ "error": "Memory not found" }`

---

### `DELETE /api/v1/memories/:id`

Delete a memory.

**Response 204:** No content.  
**Response 404:** `{ "error": "Memory not found" }`

---

### `GET /api/v1/capabilities/latest`

Get the most recent capability snapshot.

**Response 200:** `CapabilitySnapshot` object.  
**Response 404:** No snapshot yet.

---

### `POST /api/v1/sync/export`

Export all memories to a remote URL (HTTP PUT).

**Request body:**
```json
{ "url": "https://example.com/pecs-backup", "token": "optional-remote-auth-token" }
```

**Response 200:**
```json
{ "exported": 42, "message": "Exported 42 memories" }
```

---

### `POST /api/v1/sync/import`

Import memories from a remote URL (HTTP GET). Deduplicates by ID.

**Request body:**
```json
{ "url": "https://example.com/pecs-backup", "token": "optional-remote-auth-token" }
```

**Response 200:**
```json
{ "imported": 5, "message": "Imported 5 new memories" }
```

---

## Error format

All error responses follow:
```json
{ "error": "Human-readable message", "details": {} }
```

HTTP status codes: 400 (bad request), 401 (unauthorized), 404 (not found), 500 (internal), 502 (sync failed).
