import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { createApiServer } from '../../src/server/ApiServer';
import { StorageManager } from '../../src/storage/StorageManager';
import { MemoryStore } from '../../src/storage/MemoryStore';
import { CapabilityStore } from '../../src/storage/CapabilityStore';
import { DesktopSearchEngine } from '../../src/search/DesktopSearchEngine';
import { CloudSync } from '../../src/sync/CloudSync';
import type { Express } from 'express';

const TOKEN = 'test-token-abc123';
const AUTH = `Bearer ${TOKEN}`;

async function makeDeps() {
  const tmpDir = path.join(os.tmpdir(), `pecs-test-${uuidv4()}`);
  await fs.mkdir(tmpDir, { recursive: true });
  const storage = new StorageManager(tmpDir);
  await storage.load();
  const memoryStore = new MemoryStore(storage);
  const capabilityStore = new CapabilityStore(storage);
  const searchEngine = new DesktopSearchEngine(memoryStore);
  const cloudSync = new CloudSync(memoryStore);
  return { memoryStore, capabilityStore, searchEngine, cloudSync, tmpDir };
}

describe('GET /api/v1/status', () => {
  let app: Express;

  beforeEach(async () => {
    const deps = await makeDeps();
    app = createApiServer({ ...deps, token: TOKEN, version: '0.6.0', startedAt: new Date() });
  });

  it('returns 200 with version and status', async () => {
    const res = await request(app).get('/api/v1/status');
    expect(res.status).toBe(200);
    expect(res.body.version).toBe('0.6.0');
    expect(res.body.status).toBe('running');
    expect(typeof res.body.uptime).toBe('number');
    expect(typeof res.body.memoryCount).toBe('number');
  });

  it('does not require auth', async () => {
    const res = await request(app).get('/api/v1/status');
    expect(res.status).toBe(200);
  });
});

describe('Auth middleware', () => {
  let app: Express;

  beforeEach(async () => {
    const deps = await makeDeps();
    app = createApiServer({ ...deps, token: TOKEN, version: '0.6.0', startedAt: new Date() });
  });

  it('rejects missing Authorization header with 401', async () => {
    const res = await request(app).get('/api/v1/memories');
    expect(res.status).toBe(401);
  });

  it('rejects wrong token with 401', async () => {
    const res = await request(app).get('/api/v1/memories').set('Authorization', 'Bearer wrong-token');
    expect(res.status).toBe(401);
  });

  it('accepts correct Bearer token', async () => {
    const res = await request(app).get('/api/v1/memories').set('Authorization', AUTH);
    expect(res.status).toBe(200);
  });
});

describe('POST /api/v1/memories', () => {
  let app: Express;
  let memoryStore: MemoryStore;
  let tmpDir: string;

  beforeEach(async () => {
    const deps = await makeDeps();
    memoryStore = deps.memoryStore;
    tmpDir = deps.tmpDir;
    app = createApiServer({ ...deps, token: TOKEN, version: '0.6.0', startedAt: new Date() });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('creates a memory with defaults and returns 201', async () => {
    const res = await request(app)
      .post('/api/v1/memories')
      .set('Authorization', AUTH)
      .send({ title: 'Switched to Vitest', content: 'Vitest runs without Electron — no more jest-haste-map issues' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Switched to Vitest');
    expect(res.body.type).toBe('note');
    expect(res.body.workspaceId).toBe('desktop');
    expect(res.body.id).toBeTruthy();
  });

  it('persists memory so it is retrievable', async () => {
    await request(app)
      .post('/api/v1/memories')
      .set('Authorization', AUTH)
      .send({ title: 'Stored', content: 'Check persistence' });

    const all = await memoryStore.getAllWorkspaces();
    expect(all.some(m => m.title === 'Stored')).toBe(true);
  });

  it('returns 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/memories')
      .set('Authorization', AUTH)
      .send({ title: '' }); // missing content, empty title
    expect(res.status).toBe(400);
  });

  it('accepts full memory with all optional fields', async () => {
    const res = await request(app)
      .post('/api/v1/memories')
      .set('Authorization', AUTH)
      .send({
        workspaceId: 'my-project',
        type: 'decision',
        title: 'Chose Zod for validation',
        content: 'Schema-first approach with runtime inference',
        tags: ['typescript', 'validation'],
        filePath: 'src/schema.ts',
      });

    expect(res.status).toBe(201);
    expect(res.body.type).toBe('decision');
    expect(res.body.tags).toContain('typescript');
    expect(res.body.workspaceId).toBe('my-project');
  });
});

describe('GET /api/v1/memories/search', () => {
  let app: Express;
  let tmpDir: string;

  beforeEach(async () => {
    const deps = await makeDeps();
    tmpDir = deps.tmpDir;
    await deps.memoryStore.add({ workspaceId: 'ws', type: 'note', title: 'Docker setup', content: 'Ran into issues with Docker networking on macOS', tags: [] });
    await deps.memoryStore.add({ workspaceId: 'ws', type: 'learning', title: 'TypeScript tips', content: 'Use satisfies operator for better type inference', tags: ['typescript'] });
    app = createApiServer({ ...deps, token: TOKEN, version: '0.6.0', startedAt: new Date() });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns matching results', async () => {
    const res = await request(app).get('/api/v1/memories/search?q=Docker').set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].title).toContain('Docker');
  });

  it('returns 400 when q is missing', async () => {
    const res = await request(app).get('/api/v1/memories/search').set('Authorization', AUTH);
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/v1/memories/:id', () => {
  let app: Express;
  let tmpDir: string;

  beforeEach(async () => {
    const deps = await makeDeps();
    tmpDir = deps.tmpDir;
    app = createApiServer({ ...deps, token: TOKEN, version: '0.6.0', startedAt: new Date() });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('deletes an existing memory and returns 204', async () => {
    const createRes = await request(app)
      .post('/api/v1/memories')
      .set('Authorization', AUTH)
      .send({ title: 'To delete', content: 'Temporary memory' });

    const id = createRes.body.id as string;
    const deleteRes = await request(app)
      .delete(`/api/v1/memories/${id}`)
      .set('Authorization', AUTH);
    expect(deleteRes.status).toBe(204);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app)
      .delete('/api/v1/memories/00000000-0000-0000-0000-000000000000')
      .set('Authorization', AUTH);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/capabilities/latest', () => {
  let app: Express;
  let tmpDir: string;

  beforeEach(async () => {
    const deps = await makeDeps();
    tmpDir = deps.tmpDir;
    app = createApiServer({ ...deps, token: TOKEN, version: '0.6.0', startedAt: new Date() });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns 404 when no snapshot exists', async () => {
    const res = await request(app).get('/api/v1/capabilities/latest').set('Authorization', AUTH);
    expect(res.status).toBe(404);
  });
});
