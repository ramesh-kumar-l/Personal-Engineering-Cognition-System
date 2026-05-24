import type { Memory } from '../storage/schema';

export type AgentRole = 'planner' | 'executor' | 'reviewer' | 'synthesizer';

export interface OrchestratorConfig {
  aiEndpoint: string;
  aiModel: string;
  apiKey?: string;
  maxParallelExecutors?: number;
}

export interface AgentResult {
  role: AgentRole;
  output: string;
}

export interface OrchestrationRun {
  id: string;
  goal: string;
  plan: string[];
  results: AgentResult[];
  synthesis: string;
  completedAt: string;
}

async function callAI(config: OrchestratorConfig, system: string, user: string): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const isAnthropic = config.aiEndpoint.includes('anthropic.com');

  if (config.apiKey) {
    headers[isAnthropic ? 'x-api-key' : 'Authorization'] = isAnthropic
      ? config.apiKey
      : `Bearer ${config.apiKey}`;
    if (isAnthropic) headers['anthropic-version'] = '2023-06-01';
  }

  const body = isAnthropic
    ? { model: config.aiModel, max_tokens: 2048, system, messages: [{ role: 'user', content: user }] }
    : { model: config.aiModel, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] };

  const response = await fetch(config.aiEndpoint, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`AI call failed with HTTP ${response.status}`);

  const data = await response.json() as Record<string, unknown>;
  if (isAnthropic) {
    return ((data['content'] as Array<{ text: string }>)?.[0]?.text) ?? '';
  }
  return ((data['choices'] as Array<{ message: { content: string } }>)?.[0]?.message?.content) ?? '';
}

function parseJsonArray(raw: string): string[] {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [raw.trim()];
  try { return JSON.parse(match[0]) as string[]; } catch { return [raw.trim()]; }
}

export class AgentOrchestrator {
  constructor(private readonly config: OrchestratorConfig) {}

  async run(goal: string, memories: Memory[] = []): Promise<OrchestrationRun> {
    const id = crypto.randomUUID();
    const memCtx = memories.length > 0
      ? '\n\nRelevant memories:\n' + memories
          .map(m => `- [${m.type}] ${m.title}: ${m.content.slice(0, 200)}`)
          .join('\n')
      : '';

    // 1. PLANNER: break goal into 2–5 steps
    const planRaw = await callAI(
      this.config,
      'You are a planning agent. Break the goal into 2–5 concrete actionable steps. Output only a JSON array of step strings, no commentary.',
      `Goal: ${goal}${memCtx}`,
    );
    const plan = parseJsonArray(planRaw).slice(0, 5);

    // 2. EXECUTOR: run each step (batched for parallelism)
    const maxParallel = this.config.maxParallelExecutors ?? 3;
    const execResults: AgentResult[] = [];
    for (let i = 0; i < plan.length; i += maxParallel) {
      const batch = plan.slice(i, i + maxParallel);
      const batchOut = await Promise.all(batch.map(async (step) => {
        const output = await callAI(
          this.config,
          `You are an execution agent. Goal context: "${goal}". Execute the given step and produce a clear result.${memCtx}`,
          `Step to execute: ${step}`,
        );
        return { role: 'executor' as AgentRole, output };
      }));
      execResults.push(...batchOut);
    }

    // 3. REVIEWER: evaluate all results
    const execSummary = execResults.map((r, i) => `Step ${i + 1} (${plan[i]}):\n${r.output}`).join('\n\n');
    const reviewOutput = await callAI(
      this.config,
      'You are a reviewing agent. Evaluate whether execution results fully address the goal. Note any gaps concisely.',
      `Goal: "${goal}"\n\nResults:\n${execSummary}`,
    );
    const results: AgentResult[] = [...execResults, { role: 'reviewer', output: reviewOutput }];

    // 4. SYNTHESIZER: combine into final answer
    const synthesis = await callAI(
      this.config,
      'You are a synthesis agent. Combine all results into a single coherent, actionable answer.',
      `Goal: "${goal}"\n\nExecution:\n${execSummary}\n\nReview:\n${reviewOutput}`,
    );

    return { id, goal, plan, results, synthesis, completedAt: new Date().toISOString() };
  }
}
