import { Router } from 'express';
import type { ApiDependencies } from '../ApiServer';

export function createStatusRouter(deps: Pick<ApiDependencies, 'version' | 'startedAt' | 'memoryStore'>): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    try {
      const uptime = Math.floor((Date.now() - deps.startedAt.getTime()) / 1000);
      const memoryCount = await deps.memoryStore.count();
      res.json({ version: deps.version, status: 'running', uptime, memoryCount });
    } catch {
      res.status(500).json({ error: 'Internal error' });
    }
  });

  return router;
}
