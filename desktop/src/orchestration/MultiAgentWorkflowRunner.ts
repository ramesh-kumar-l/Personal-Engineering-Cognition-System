import { AgentOrchestrator, type OrchestratorConfig, type OrchestrationRun } from './AgentOrchestrator';
import type { MemoryStore } from '../storage/MemoryStore';

export interface WorkflowRunResult {
  orchestrationId: string;
  goal: string;
  plan: string[];
  synthesis: string;
  durationMs: number;
}

export class MultiAgentWorkflowRunner {
  private readonly orchestrator: AgentOrchestrator;

  constructor(
    config: OrchestratorConfig,
    private readonly memoryStore: MemoryStore,
  ) {
    this.orchestrator = new AgentOrchestrator(config);
  }

  async run(goal: string, workspaceId?: string): Promise<WorkflowRunResult> {
    const start = Date.now();

    const memories = workspaceId
      ? await this.memoryStore.getAll(workspaceId)
      : await this.memoryStore.getAllWorkspaces();

    // Use the 15 most recent memories as context
    const context = memories
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 15);

    const run: OrchestrationRun = await this.orchestrator.run(goal, context);

    return {
      orchestrationId: run.id,
      goal: run.goal,
      plan: run.plan,
      synthesis: run.synthesis,
      durationMs: Date.now() - start,
    };
  }
}
