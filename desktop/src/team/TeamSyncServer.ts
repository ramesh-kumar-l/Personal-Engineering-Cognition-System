import express, { type Request, type Response } from 'express';
import type { Server } from 'http';
import { MemorySchema, type Memory } from '../storage/schema';

export interface TeamSyncServerConfig {
  port: number;
  teamToken: string;
}

interface TeamStore {
  [teamId: string]: Memory[];
}

export class TeamSyncServer {
  private server?: Server;
  private readonly store: TeamStore = {};

  constructor(private readonly config: TeamSyncServerConfig) {}

  get isRunning(): boolean {
    return this.server !== undefined;
  }

  start(): Promise<void> {
    if (this.server) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const app = express();
      app.use(express.json({ limit: '50mb' }));

      const auth = (req: Request, res: Response, next: () => void): void => {
        if (req.headers.authorization !== `Bearer ${this.config.teamToken}`) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }
        next();
      };

      app.post('/api/team/v1/push', auth, (req: Request, res: Response): void => {
        const { memories, teamId } = req.body as { memories: unknown[]; teamId?: string };
        if (!Array.isArray(memories) || !teamId) {
          res.status(400).json({ error: 'Invalid payload: memories[] and teamId required' });
          return;
        }

        if (!this.store[teamId]) this.store[teamId] = [];
        const existing = new Set(this.store[teamId].map(m => m.id));
        const toAdd = memories.filter(m => {
          const r = MemorySchema.safeParse(m);
          return r.success && !existing.has((m as Memory).id);
        }) as Memory[];

        this.store[teamId].push(...toAdd);
        res.json({ accepted: toAdd.length });
      });

      app.get('/api/team/v1/pull', auth, (req: Request, res: Response): void => {
        const { teamId, since } = req.query as { teamId?: string; since?: string };
        if (!teamId) { res.status(400).json({ error: 'teamId query param required' }); return; }

        let memories = this.store[teamId] ?? [];
        if (since) memories = memories.filter(m => m.updatedAt > since);
        res.json({ memories });
      });

      app.get('/api/team/v1/status', auth, (_req: Request, res: Response): void => {
        const teams = Object.entries(this.store).map(([id, mems]) => ({
          teamId: id,
          memoryCount: mems.length,
        }));
        res.json({ teams, uptime: process.uptime() });
      });

      this.server = app.listen(this.config.port, '127.0.0.1', () => resolve());
      this.server.on('error', (err) => {
        this.server = undefined;
        reject(err);
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) { resolve(); return; }
      this.server.close(() => {
        this.server = undefined;
        resolve();
      });
    });
  }
}
