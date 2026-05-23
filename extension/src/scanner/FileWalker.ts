import ignore, { type Ignore } from 'ignore';
import { glob } from 'glob';
import * as fs from 'fs/promises';
import * as path from 'path';
import { isTextFile, filePriority } from './LanguageDetector';

export type WalkedFile = {
  relativePath: string;
  absolutePath: string;
  sizeBytes: number;
  extension: string;
};

type WalkerOptions = {
  maxFiles: number;
  maxFileSizeBytes: number;
  excludePatterns: string[];
};

export class FileWalker {
  async walk(rootPath: string, options: WalkerOptions): Promise<WalkedFile[]> {
    const ig = await this.buildIgnore(rootPath, options.excludePatterns);

    const allPaths = await glob('**/*', {
      cwd: rootPath,
      nodir: true,
      dot: false,
      ignore: options.excludePatterns,
    });

    const filtered: Array<{ relativePath: string; priority: number }> = [];

    for (const rel of allPaths) {
      const normalized = rel.replace(/\\/g, '/');
      if (ig.ignores(normalized)) continue;

      const ext = path.extname(normalized);
      if (!isTextFile(ext)) continue;

      filtered.push({ relativePath: normalized, priority: filePriority(normalized) });
    }

    // Sort by priority descending — highest priority files included first
    filtered.sort((a, b) => b.priority - a.priority);

    const result: WalkedFile[] = [];

    for (const { relativePath } of filtered) {
      if (result.length >= options.maxFiles) break;

      const absolutePath = path.join(rootPath, relativePath);
      try {
        const stat = await fs.stat(absolutePath);
        if (stat.size > options.maxFileSizeBytes) continue;

        result.push({
          relativePath,
          absolutePath,
          sizeBytes: stat.size,
          extension: path.extname(relativePath),
        });
      } catch {
        // file disappeared between glob and stat — skip
      }
    }

    return result;
  }

  private async buildIgnore(rootPath: string, excludePatterns: string[]): Promise<Ignore> {
    const ig = ignore();

    try {
      const gitignorePath = path.join(rootPath, '.gitignore');
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      ig.add(gitignoreContent);
    } catch {
      // no .gitignore — that's fine
    }

    if (excludePatterns.length > 0) {
      // Convert glob patterns to ignore-compatible patterns
      const normalized = excludePatterns.map(p =>
        p.replace(/^\*\*\//, '').replace(/\/\*\*$/, '')
      );
      ig.add(normalized);
    }

    return ig;
  }
}
