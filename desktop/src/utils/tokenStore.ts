import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export async function getOrCreateToken(storageDir: string): Promise<string> {
  const tokenFile = path.join(storageDir, 'api-token');
  await fs.mkdir(storageDir, { recursive: true });
  try {
    const token = await fs.readFile(tokenFile, 'utf-8');
    return token.trim();
  } catch {
    const token = crypto.randomBytes(32).toString('hex');
    // mode 0o600: owner read/write only — token is a secret
    await fs.writeFile(tokenFile, token, { mode: 0o600, encoding: 'utf-8' });
    return token;
  }
}
