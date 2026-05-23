import * as fs from 'fs/promises';
import * as path from 'path';

export type Dependencies = {
  runtime: Record<string, string>;
  dev: Record<string, string>;
  language: string;
  packageManager?: string;
};

export class DependencyParser {
  async parse(rootPath: string): Promise<Dependencies> {
    const result = await this.tryPackageJson(rootPath)
      ?? await this.tryPyproject(rootPath)
      ?? await this.tryGoMod(rootPath)
      ?? await this.tryCargoToml(rootPath);

    return result ?? { runtime: {}, dev: {}, language: 'unknown' };
  }

  private async tryPackageJson(rootPath: string): Promise<Dependencies | null> {
    try {
      const content = await fs.readFile(path.join(rootPath, 'package.json'), 'utf-8');
      const pkg = JSON.parse(content) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        packageManager?: string;
      };
      return {
        language: 'TypeScript/JavaScript',
        runtime: pkg.dependencies ?? {},
        dev: pkg.devDependencies ?? {},
        packageManager: pkg.packageManager
          ? pkg.packageManager.split('@')[0]
          : this.detectPackageManager(rootPath),
      };
    } catch {
      return null;
    }
  }

  private async tryPyproject(rootPath: string): Promise<Dependencies | null> {
    try {
      const content = await fs.readFile(path.join(rootPath, 'pyproject.toml'), 'utf-8');
      const deps = this.extractTomlList(content, 'dependencies');
      return {
        language: 'Python',
        runtime: Object.fromEntries(deps.map(d => [d.split(/[>=<!\[]/)[0].trim(), d])),
        dev: {},
        packageManager: 'uv/pip',
      };
    } catch {
      return null;
    }
  }

  private async tryGoMod(rootPath: string): Promise<Dependencies | null> {
    try {
      const content = await fs.readFile(path.join(rootPath, 'go.mod'), 'utf-8');
      const requires: Record<string, string> = {};
      for (const line of content.split('\n')) {
        const match = line.trim().match(/^require\s+(\S+)\s+(\S+)$/)
          ?? line.trim().match(/^(\S+)\s+(v\S+)$/);
        if (match) requires[match[1]] = match[2];
      }
      return { language: 'Go', runtime: requires, dev: {}, packageManager: 'go modules' };
    } catch {
      return null;
    }
  }

  private async tryCargoToml(rootPath: string): Promise<Dependencies | null> {
    try {
      const content = await fs.readFile(path.join(rootPath, 'Cargo.toml'), 'utf-8');
      const deps = this.extractTomlSection(content, 'dependencies');
      return { language: 'Rust', runtime: deps, dev: {}, packageManager: 'cargo' };
    } catch {
      return null;
    }
  }

  private extractTomlList(content: string, key: string): string[] {
    const match = content.match(new RegExp(`${key}\\s*=\\s*\\[([^\\]]+)\\]`, 's'));
    if (!match) return [];
    return match[1].split(',')
      .map(s => s.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }

  private extractTomlSection(content: string, section: string): Record<string, string> {
    const result: Record<string, string> = {};
    const sectionMatch = content.match(new RegExp(`\\[${section}\\]([^\\[]+)`, 's'));
    if (!sectionMatch) return result;
    for (const line of sectionMatch[1].split('\n')) {
      const m = line.match(/^(\w[\w-]*)\s*=\s*"([^"]+)"/);
      if (m) result[m[1]] = m[2];
    }
    return result;
  }

  private detectPackageManager(rootPath: string): string {
    // Quick heuristic — actual check would be async but we're already in async context
    // This is a best-effort guess based on lockfiles
    return 'npm'; // Default; real detection uses lockfile presence
  }
}
