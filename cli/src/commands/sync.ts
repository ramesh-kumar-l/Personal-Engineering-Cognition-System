import type { Command } from 'commander';
import { PecsClient } from '../client';
import { loadConfig } from '../config';

export function registerSync(program: Command): void {
  const sync = program.command('sync').description('Cloud sync operations');

  sync
    .command('export <url>')
    .description('Export memories to a remote URL via HTTP PUT')
    .option('--token <token>', 'auth token for the remote endpoint')
    .action(async (url: string, opts: { token?: string }) => {
      const client = new PecsClient(loadConfig());
      try {
        const body: Record<string, string> = { url };
        if (opts.token) body['token'] = opts.token;
        const result = await client.post<{ exported: number }>('/sync/export', body);
        console.log(`Exported ${result.exported} memories to ${url}`);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  sync
    .command('import <url>')
    .description('Import memories from a remote URL via HTTP GET')
    .option('--token <token>', 'auth token for the remote endpoint')
    .action(async (url: string, opts: { token?: string }) => {
      const client = new PecsClient(loadConfig());
      try {
        const body: Record<string, string> = { url };
        if (opts.token) body['token'] = opts.token;
        const result = await client.post<{ imported: number }>('/sync/import', body);
        console.log(`Imported ${result.imported} new memories from ${url}`);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
