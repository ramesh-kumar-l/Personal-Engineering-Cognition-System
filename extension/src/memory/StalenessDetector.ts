import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { Memory } from '../storage/schema';

export type StalenessStatus = 'fresh' | 'stale' | 'unknown';

export class StalenessDetector {
  async check(memory: Memory, workspaceRoot: string): Promise<StalenessStatus> {
    if (!memory.filePath) return 'unknown';

    try {
      await fs.access(memory.filePath);
    } catch {
      return 'stale'; // file deleted or moved
    }

    if (!memory.commitHash || !memory.lineRange) return 'unknown';

    const relPath = path.relative(workspaceRoot, memory.filePath).replace(/\\/g, '/');

    try {
      const originalContent = execSync(`git show ${memory.commitHash}:${relPath}`, {
        cwd: workspaceRoot,
        timeout: 5000,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const originalLines = originalContent
        .split('\n')
        .slice(memory.lineRange.start, memory.lineRange.end + 1)
        .join('\n');

      const currentContent = await fs.readFile(memory.filePath, 'utf-8');
      const currentLines = currentContent
        .split('\n')
        .slice(memory.lineRange.start, memory.lineRange.end + 1)
        .join('\n');

      return originalLines === currentLines ? 'fresh' : 'stale';
    } catch {
      return 'unknown';
    }
  }

  async checkAll(memories: Memory[], workspaceRoot: string): Promise<Map<string, StalenessStatus>> {
    const results = new Map<string, StalenessStatus>();
    // Sequential to avoid git subprocess storms on large memory sets
    for (const memory of memories) {
      results.set(memory.id, await this.check(memory, workspaceRoot));
    }
    return results;
  }
}
