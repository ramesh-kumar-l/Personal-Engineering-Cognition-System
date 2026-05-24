import type { Command } from 'commander';
import { PecsClient } from '../client';
import { loadConfig } from '../config';

interface StatusResponse {
  version: string;
  memoryCount?: number;
  uptime?: number;
  port?: number;
  apiPort?: number;
}

export function registerStatus(program: Command): void {
  program
    .command('status')
    .description('Show PECS Desktop connection status')
    .option('--json', 'output raw JSON')
    .action(async (opts: { json?: boolean }) => {
      const config = loadConfig();
      const client = new PecsClient(config);

      try {
        const s = await client.status() as StatusResponse;

        if (opts.json) { console.log(JSON.stringify(s, null, 2)); return; }
        console.log(`PECS Desktop v${s.version}`);
        console.log(`Memories : ${s.memoryCount ?? 'n/a'}`);
        console.log(`Uptime   : ${s.uptime != null ? `${Math.round(s.uptime)}s` : 'n/a'}`);
        console.log(`API      : http://127.0.0.1:${s.port ?? s.apiPort ?? config.port}`);
      } catch {
        console.error('PECS Desktop is not running or unreachable.');
        console.error(`Expected at: ${config.baseUrl}`);
        process.exit(1);
      }
    });
}
