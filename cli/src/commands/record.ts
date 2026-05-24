import type { Command } from 'commander';
import * as path from 'path';
import { PecsClient } from '../client';
import { loadConfig } from '../config';

export function registerRecord(program: Command): void {
  program
    .command('record')
    .description('Record an engineering memory')
    .requiredOption('-t, --title <title>', 'memory title')
    .requiredOption('-c, --content <content>', 'memory content')
    .option('-w, --workspace <id>', 'workspace ID', path.basename(process.cwd()))
    .option('--type <type>', 'note | decision | learning | debug | incident', 'note')
    .option('--tags <tags>', 'comma-separated tags')
    .option('--json', 'output raw JSON')
    .action(async (opts: { title: string; content: string; workspace: string; type: string; tags?: string; json?: boolean }) => {
      const client = new PecsClient(loadConfig());
      const tags = opts.tags
        ? opts.tags.split(',').map(t => t.trim()).filter(Boolean)
        : [];

      try {
        const result = await client.post<{ id: string; title: string }>('/memories', {
          workspaceId: opts.workspace,
          type: opts.type,
          title: opts.title,
          content: opts.content,
          tags,
        });

        if (opts.json) { console.log(JSON.stringify(result, null, 2)); return; }
        console.log(`Memory recorded: "${result.title}" (${result.id})`);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
