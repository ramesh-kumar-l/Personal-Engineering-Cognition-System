import { Router } from 'express';
import { z } from 'zod';
import type { ApiDependencies } from '../ApiServer';

const SyncSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  token: z.string().optional(),
});

export function createSyncRouter(deps: Pick<ApiDependencies, 'cloudSync'>): Router {
  const router = Router();

  router.post('/export', async (req, res) => {
    const parsed = SyncSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }
    try {
      const exported = await deps.cloudSync.export(parsed.data.url, parsed.data.token);
      res.json({ exported, message: `Exported ${exported} memories` });
    } catch (e) {
      res.status(502).json({ error: 'Export failed', detail: String(e) });
    }
  });

  router.post('/import', async (req, res) => {
    const parsed = SyncSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }
    try {
      const imported = await deps.cloudSync.import(parsed.data.url, parsed.data.token);
      res.json({ imported, message: `Imported ${imported} new memories` });
    } catch (e) {
      res.status(502).json({ error: 'Import failed', detail: String(e) });
    }
  });

  return router;
}
