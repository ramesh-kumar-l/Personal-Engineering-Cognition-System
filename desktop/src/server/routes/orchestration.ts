import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { MultiAgentWorkflowRunner } from '../../orchestration/MultiAgentWorkflowRunner';
import type { MemoryStore } from '../../storage/MemoryStore';

const RunSchema = z.object({
  goal: z.string().min(1, 'goal is required'),
  workspaceId: z.string().optional(),
  aiEndpoint: z.string().url('aiEndpoint must be a valid URL'),
  aiModel: z.string().min(1, 'aiModel is required'),
  apiKey: z.string().optional(),
  maxParallelExecutors: z.number().int().min(1).max(5).optional(),
});

export function createOrchestrationRouter(deps: { memoryStore: MemoryStore }): Router {
  const router = Router();

  router.post('/run', async (req: Request, res: Response): Promise<void> => {
    const parsed = RunSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
      return;
    }

    const { goal, workspaceId, aiEndpoint, aiModel, apiKey, maxParallelExecutors } = parsed.data;
    const runner = new MultiAgentWorkflowRunner(
      { aiEndpoint, aiModel, apiKey, maxParallelExecutors },
      deps.memoryStore,
    );

    try {
      const result = await runner.run(goal, workspaceId);
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: `Orchestration failed: ${(err as Error).message}` });
    }
  });

  return router;
}
