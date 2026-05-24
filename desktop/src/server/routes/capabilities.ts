import { Router } from 'express';
import type { ApiDependencies } from '../ApiServer';

export function createCapabilitiesRouter(deps: Pick<ApiDependencies, 'capabilityStore'>): Router {
  const router = Router();

  router.get('/latest', async (_req, res) => {
    try {
      const snapshot = await deps.capabilityStore.getLatestSnapshot();
      if (!snapshot) {
        res.status(404).json({ error: 'No capability snapshot found. Run "Track Capabilities" first.' });
        return;
      }
      res.json(snapshot);
    } catch {
      res.status(500).json({ error: 'Internal error' });
    }
  });

  router.get('/snapshots', async (_req, res) => {
    try {
      const snapshots = await deps.capabilityStore.getSnapshots();
      res.json(snapshots);
    } catch {
      res.status(500).json({ error: 'Internal error' });
    }
  });

  return router;
}
