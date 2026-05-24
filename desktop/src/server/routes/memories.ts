import { Router } from 'express';
import { z } from 'zod';
import type { ApiDependencies } from '../ApiServer';

const CreateMemorySchema = z.object({
  workspaceId: z.string().min(1).default('desktop'),
  type: z.enum(['debug', 'decision', 'learning', 'incident', 'note']).default('note'),
  title: z.string().min(1, 'title is required'),
  content: z.string().min(1, 'content is required'),
  tags: z.array(z.string()).default([]),
  filePath: z.string().optional(),
});

export function createMemoriesRouter(deps: Pick<ApiDependencies, 'memoryStore' | 'searchEngine'>): Router {
  const router = Router();

  router.get('/search', async (req, res) => {
    const q = req.query['q'] as string | undefined;
    if (!q?.trim()) {
      res.status(400).json({ error: 'Missing required query parameter: q' });
      return;
    }
    const workspace = req.query['workspace'] as string | undefined;
    const limit = Math.min(parseInt((req.query['limit'] as string) ?? '20', 10), 100);
    try {
      const results = await deps.searchEngine.query(q, workspace, { maxResults: limit });
      res.json(results);
    } catch (e) {
      res.status(500).json({ error: 'Search failed', detail: String(e) });
    }
  });

  router.get('/', async (req, res) => {
    try {
      const workspace = req.query['workspace'] as string | undefined;
      const memories = workspace
        ? await deps.memoryStore.getAll(workspace)
        : await deps.memoryStore.getAllWorkspaces();
      res.json(memories);
    } catch {
      res.status(500).json({ error: 'Internal error' });
    }
  });

  router.post('/', async (req, res) => {
    const parsed = CreateMemorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }
    try {
      const memory = await deps.memoryStore.add(parsed.data);
      res.status(201).json(memory);
    } catch {
      res.status(500).json({ error: 'Internal error' });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const memory = await deps.memoryStore.getById(req.params['id']!);
      if (!memory) { res.status(404).json({ error: 'Memory not found' }); return; }
      res.json(memory);
    } catch {
      res.status(500).json({ error: 'Internal error' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const deleted = await deps.memoryStore.delete(req.params['id']!);
      if (!deleted) { res.status(404).json({ error: 'Memory not found' }); return; }
      res.sendStatus(204);
    } catch {
      res.status(500).json({ error: 'Internal error' });
    }
  });

  return router;
}
