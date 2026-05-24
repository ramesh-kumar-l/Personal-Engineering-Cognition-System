import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface PecsConfig {
  port: number;
  token: string;
  baseUrl: string;
}

export function loadConfig(): PecsConfig {
  const port = parseInt(process.env['PECS_PORT'] ?? '39457', 10);
  const tokenPath = process.env['PECS_TOKEN_FILE'] ?? path.join(os.homedir(), '.pecs', 'api-token');

  let token = process.env['PECS_TOKEN'] ?? '';
  if (!token) {
    try {
      token = fs.readFileSync(tokenPath, 'utf-8').trim();
    } catch {
      // token remains empty; commands requiring auth will surface the error
    }
  }

  return { port, token, baseUrl: `http://127.0.0.1:${port}` };
}
