import express, { type Express } from 'express';
import type { MemoryStore } from '../storage/MemoryStore';
import type { CapabilityStore } from '../storage/CapabilityStore';
import type { DesktopSearchEngine } from '../search/DesktopSearchEngine';
import type { CloudSync } from '../sync/CloudSync';
import { authMiddleware } from './auth';
import { createStatusRouter } from './routes/status';
import { createMemoriesRouter } from './routes/memories';
import { createCapabilitiesRouter } from './routes/capabilities';
import { createSyncRouter } from './routes/sync';
import { createOrchestrationRouter } from './routes/orchestration';
import { createSynthesisRouter } from './routes/synthesis';
import { createTeamRouter } from './routes/team';

export type ApiDependencies = {
  memoryStore: MemoryStore;
  capabilityStore: CapabilityStore;
  searchEngine: DesktopSearchEngine;
  cloudSync: CloudSync;
  token: string;
  version: string;
  startedAt: Date;
};

export function createApiServer(deps: ApiDependencies): Express {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  // CORS: allow any localhost origin (editor plugins, dev tools)
  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
    next();
  });
  app.options('*', (_req, res) => res.sendStatus(204));

  // Status endpoint is public — useful for health checks and editor plugin discovery
  app.use('/api/v1/status', createStatusRouter(deps));

  // All other routes require a valid Bearer token
  app.use('/api/v1', authMiddleware(deps.token));
  app.use('/api/v1/memories', createMemoriesRouter(deps));
  app.use('/api/v1/capabilities', createCapabilitiesRouter(deps));
  app.use('/api/v1/sync', createSyncRouter(deps));
  app.use('/api/v1/orchestration', createOrchestrationRouter(deps));
  app.use('/api/v1/synthesis', createSynthesisRouter(deps));
  app.use('/api/v1/team', createTeamRouter(deps));

  // Catch-all 404
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  return app;
}
