import type { Command } from 'commander';
import { PecsClient } from '../client';
import { loadConfig } from '../config';

interface WorkflowRunResult {
  orchestrationId: string;
  goal: string;
  plan: string[];
  synthesis: string;
  durationMs: number;
}

interface SynthesisResult {
  insights: string[];
  patterns: string[];
  recommendations: string[];
  rawSummary: string;
  memoryCount: number;
  workspaces: string[];
}

export function registerWorkflow(program: Command): void {
  const wf = program.command('workflow').description('Multi-agent AI workflow operations');

  wf
    .command('run <goal>')
    .description('Run multi-agent orchestration for a natural-language goal')
    .requiredOption('--endpoint <url>', 'AI endpoint URL (OpenAI-compat or Anthropic)')
    .requiredOption('--model <name>', 'AI model name')
    .option('--key <apiKey>', 'AI API key (or set PECS_AI_KEY env var)')
    .option('-w, --workspace <id>', 'workspace to load memory context from')
    .option('--json', 'output raw JSON')
    .action(async (
      goal: string,
      opts: { endpoint: string; model: string; key?: string; workspace?: string; json?: boolean },
    ) => {
      const client = new PecsClient(loadConfig());
      const apiKey = opts.key ?? process.env['PECS_AI_KEY'];

      try {
        console.error('Running multi-agent orchestration…');
        const body: Record<string, string> = {
          goal,
          aiEndpoint: opts.endpoint,
          aiModel: opts.model,
        };
        if (apiKey) body['apiKey'] = apiKey;
        if (opts.workspace) body['workspaceId'] = opts.workspace;

        const result = await client.post<WorkflowRunResult>('/orchestration/run', body);

        if (opts.json) { console.log(JSON.stringify(result, null, 2)); return; }
        console.log(`\nGoal: ${result.goal}`);
        console.log('\nPlan:');
        result.plan.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
        console.log(`\nSynthesis:\n${result.synthesis}`);
        console.log(`\nCompleted in ${result.durationMs}ms`);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  wf
    .command('synthesize')
    .description('Synthesize insights across memories using AI')
    .requiredOption('--endpoint <url>', 'AI endpoint URL')
    .requiredOption('--model <name>', 'AI model name')
    .option('--key <apiKey>', 'AI API key (or set PECS_AI_KEY env var)')
    .option('-w, --workspace <id>', 'limit synthesis to one workspace')
    .option('--json', 'output raw JSON')
    .action(async (opts: { endpoint: string; model: string; key?: string; workspace?: string; json?: boolean }) => {
      const client = new PecsClient(loadConfig());
      const apiKey = opts.key ?? process.env['PECS_AI_KEY'];

      try {
        console.error('Synthesizing memories…');
        const body: Record<string, string> = {
          aiEndpoint: opts.endpoint,
          aiModel: opts.model,
        };
        if (apiKey) body['apiKey'] = apiKey;
        if (opts.workspace) body['workspaceId'] = opts.workspace;

        const result = await client.post<SynthesisResult>('/synthesis', body);

        if (opts.json) { console.log(JSON.stringify(result, null, 2)); return; }
        console.log(`\nSynthesis across ${result.workspaces.length} workspace(s), ${result.memoryCount} memories:`);
        if (result.insights.length) { console.log('\nInsights:'); result.insights.forEach(i => console.log(`  • ${i}`)); }
        if (result.patterns.length) { console.log('\nPatterns:'); result.patterns.forEach(p => console.log(`  • ${p}`)); }
        if (result.recommendations.length) { console.log('\nRecommendations:'); result.recommendations.forEach(r => console.log(`  • ${r}`)); }
        if (!result.insights.length && !result.patterns.length) console.log(`\n${result.rawSummary}`);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
