import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { MemorySynthesizer } from '../../synthesis/MemorySynthesizer';
import type { MemoryStore } from '../../storage/MemoryStore';

const SynthesisSchema = z.object({
  workspaceId: z.string().optional(),
  aiEndpoint: z.string().url('aiEndpoint must be a valid URL'),
  aiModel: z.string().min(1, 'aiModel is required'),
  apiKey: z.string().optional(),
});

export function createSynthesisRouter(deps: { memoryStore: MemoryStore }): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response): Promise<void> => {
    const parsed = SynthesisSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
      return;
    }

    const { workspaceId, aiEndpoint, aiModel, apiKey } = parsed.data;
    const memories = workspaceId
      ? await deps.memoryStore.getAll(workspaceId)
      : await deps.memoryStore.getAllWorkspaces();

    if (memories.length === 0) {
      res.status(404).json({ error: 'No memories found to synthesize' });
      return;
    }

    const synthesizer = new MemorySynthesizer({ aiEndpoint, aiModel, apiKey });

    try {
      const result = await synthesizer.synthesize(memories);
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: `Synthesis failed: ${(err as Error).message}` });
    }
  });

  return router;
}
