import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { TeamSyncServer } from '../../team/TeamSyncServer';
import { TeamClient } from '../../team/TeamClient';
import type { MemoryStore } from '../../storage/MemoryStore';

const StartSchema = z.object({
  port: z.number().int().min(1024).max(65535).optional(),
  teamToken: z.string().min(8, 'teamToken must be at least 8 characters'),
});

const PushSchema = z.object({
  serverUrl: z.string().url(),
  teamToken: z.string().min(1),
  teamId: z.string().min(1),
  workspaceId: z.string().optional(),
});

const PullSchema = z.object({
  serverUrl: z.string().url(),
  teamToken: z.string().min(1),
  teamId: z.string().min(1),
  since: z.string().optional(),
});

export function createTeamRouter(deps: { memoryStore: MemoryStore }): Router {
  const router = Router();
  let activeServer: TeamSyncServer | null = null;

  // Start a self-hosted team relay on a local port
  router.post('/relay/start', async (req: Request, res: Response): Promise<void> => {
    if (activeServer?.isRunning) {
      res.json({ status: 'already_running' });
      return;
    }
    const parsed = StartSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
      return;
    }

    const { port = 39458, teamToken } = parsed.data;
    activeServer = new TeamSyncServer({ port, teamToken });

    try {
      await activeServer.start();
      res.json({ status: 'started', port });
    } catch (err) {
      activeServer = null;
      res.status(500).json({ error: `Failed to start relay: ${(err as Error).message}` });
    }
  });

  router.post('/relay/stop', async (_req: Request, res: Response): Promise<void> => {
    if (!activeServer?.isRunning) {
      res.json({ status: 'not_running' });
      return;
    }
    await activeServer.stop();
    activeServer = null;
    res.json({ status: 'stopped' });
  });

  router.get('/relay/status', (_req: Request, res: Response): void => {
    res.json({ running: activeServer?.isRunning ?? false });
  });

  // Push local memories to a team relay server
  router.post('/push', async (req: Request, res: Response): Promise<void> => {
    const parsed = PushSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
      return;
    }

    const { serverUrl, teamToken, teamId, workspaceId } = parsed.data;
    const memories = workspaceId
      ? await deps.memoryStore.getAll(workspaceId)
      : await deps.memoryStore.getAllWorkspaces();

    const client = new TeamClient(serverUrl, teamToken);
    try {
      const accepted = await client.push(memories, teamId);
      res.json({ pushed: memories.length, accepted });
    } catch (err) {
      res.status(502).json({ error: `Push failed: ${(err as Error).message}` });
    }
  });

  // Pull memories from a team relay server and import locally
  router.post('/pull', async (req: Request, res: Response): Promise<void> => {
    const parsed = PullSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
      return;
    }

    const { serverUrl, teamToken, teamId, since } = parsed.data;
    const client = new TeamClient(serverUrl, teamToken);

    try {
      const remote = await client.pull(teamId, since);
      const imported = await deps.memoryStore.importMemories(remote);
      res.json({ fetched: remote.length, imported });
    } catch (err) {
      res.status(502).json({ error: `Pull failed: ${(err as Error).message}` });
    }
  });

  return router;
}
