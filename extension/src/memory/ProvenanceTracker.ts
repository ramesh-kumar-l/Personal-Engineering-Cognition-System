import { execSync } from 'child_process';

export class ProvenanceTracker {
  captureCommitHash(workspaceRoot: string): string | undefined {
    try {
      const hash = execSync('git rev-parse HEAD', {
        cwd: workspaceRoot,
        timeout: 3000,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      return hash || undefined;
    } catch {
      return undefined;
    }
  }
}
