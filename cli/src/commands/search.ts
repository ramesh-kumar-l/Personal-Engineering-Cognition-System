import type { Command } from 'commander';
import { PecsClient } from '../client';
import { loadConfig } from '../config';

interface SearchResult {
  id: string;
  title: string;
  type: string;
  workspaceId: string;
  score: number;
  excerpt?: string;
}

export function registerSearch(program: Command): void {
  program
    .command('search <query>')
    .description('Search engineering memories')
    .option('-w, --workspace <id>', 'filter by workspace ID')
    .option('-l, --limit <n>', 'maximum results', '10')
    .option('--json', 'output raw JSON')
    .action(async (query: string, opts: { workspace?: string; limit: string; json?: boolean }) => {
      const client = new PecsClient(loadConfig());
      const params = new URLSearchParams({ q: query, limit: opts.limit });
      if (opts.workspace) params.set('workspace', opts.workspace);

      try {
        const results = await client.get<SearchResult[]>(`/memories/search?${params}`);

        if (opts.json) { console.log(JSON.stringify(results, null, 2)); return; }
        if (results.length === 0) { console.log('No results.'); return; }

        for (const [i, r] of results.entries()) {
          const pct = Math.round((r.score ?? 0) * 100);
          console.log(`\n${i + 1}. [${pct}%] ${r.title}  (${r.type} · ${r.workspaceId})`);
          if (r.excerpt) console.log(`   ${r.excerpt.slice(0, 120)}`);
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
