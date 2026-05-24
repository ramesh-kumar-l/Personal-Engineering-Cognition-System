import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { TeamSyncServer } from '../../src/team/TeamSyncServer';
import { TeamClient } from '../../src/team/TeamClient';
import type { Memory } from '../../src/storage/schema';

const TOKEN = 'test-team-token-xyz';
const PORT = 39500; // isolated port for tests

// id map so tests can refer to memories by logical name
const ids: Record<string, string> = {};
function memId(key: string): string {
  if (!ids[key]) ids[key] = uuidv4();
  return ids[key];
}

function makeMemory(key: string, workspaceId = 'ws', updatedAt?: string): Memory {
  const now = new Date().toISOString();
  return {
    id: memId(key), workspaceId, type: 'note', title: `Note ${key}`,
    content: 'content', tags: [],
    createdAt: now,
    updatedAt: updatedAt ?? now,
  };
}

describe('TeamSyncServer + TeamClient', () => {
  let server: TeamSyncServer;
  let client: TeamClient;

  beforeEach(async () => {
    server = new TeamSyncServer({ port: PORT, teamToken: TOKEN });
    await server.start();
    client = new TeamClient(`http://127.0.0.1:${PORT}`, TOKEN);
  });

  afterEach(async () => {
    await server.stop();
  });

  it('starts and reports isRunning', () => {
    expect(server.isRunning).toBe(true);
  });

  it('stops and reports not running', async () => {
    await server.stop();
    expect(server.isRunning).toBe(false);
  });

  it('push returns accepted count', async () => {
    const memories = [makeMemory('m1'), makeMemory('m2')];
    const accepted = await client.push(memories, 'team-alpha');
    expect(accepted).toBe(2);
  });

  it('deduplicates on push', async () => {
    const m = makeMemory('dup');
    await client.push([m], 'team-alpha');
    const second = await client.push([m, makeMemory('new-unique')], 'team-alpha');
    expect(second).toBe(1); // only the new one accepted
  });

  it('pull returns pushed memories', async () => {
    const p1 = makeMemory('p1');
    const p2 = makeMemory('p2');
    await client.push([p1, p2], 'team-beta');
    const pulled = await client.pull('team-beta');
    expect(pulled.length).toBe(2);
    expect(pulled.map(m => m.id)).toEqual(expect.arrayContaining([p1.id, p2.id]));
  });

  it('pull with since filters by updatedAt', async () => {
    const past = '2020-01-01T00:00:00.000Z';
    const future = new Date(Date.now() + 60_000).toISOString();

    const oldMem = makeMemory('old-ts', 'ws', past);
    const newMem = makeMemory('new-ts', 'ws', future);

    await client.push([oldMem, newMem], 'team-gamma');
    const pulled = await client.pull('team-gamma', new Date().toISOString());
    // Only the future-dated memory should appear
    expect(pulled.map(m => m.id)).toContain(newMem.id);
    expect(pulled.map(m => m.id)).not.toContain(oldMem.id);
  });

  it('rejects requests with wrong token', async () => {
    const badClient = new TeamClient(`http://127.0.0.1:${PORT}`, 'wrong-token');
    await expect(badClient.push([makeMemory('x')], 'team')).rejects.toThrow('401');
  });

  it('returns empty array for unknown teamId', async () => {
    const pulled = await client.pull('no-such-team');
    expect(pulled).toEqual([]);
  });
});
