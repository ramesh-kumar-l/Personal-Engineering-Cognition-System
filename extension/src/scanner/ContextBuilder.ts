import * as fs from 'fs/promises';
import * as path from 'path';
import type { WalkedFile } from './FileWalker';
import type { Dependencies } from './DependencyParser';

export class ContextBuilder {
  async build(
    rootPath: string,
    files: WalkedFile[],
    deps: Dependencies,
    budgetChars: number
  ): Promise<string> {
    const sections: string[] = [];
    let used = 0;

    const header = this.buildHeader(path.basename(rootPath), files.length, deps);
    sections.push(header);
    used += header.length;

    const tree = this.buildTree(files);
    if (used + tree.length < budgetChars) {
      sections.push(tree);
      used += tree.length;
    }

    const depSection = this.buildDepsSection(deps);
    if (used + depSection.length < budgetChars) {
      sections.push(depSection);
      used += depSection.length;
    }

    sections.push('## Key Files\n');
    used += 14;

    for (const file of files) {
      if (used >= budgetChars) break;

      const remaining = budgetChars - used;
      try {
        const raw = await fs.readFile(file.absolutePath, 'utf-8');
        const truncated = raw.length > remaining - 200
          ? raw.slice(0, remaining - 200) + '\n... [truncated]'
          : raw;

        const block = `\`\`\`${file.relativePath}\n${truncated}\n\`\`\`\n\n`;
        sections.push(block);
        used += block.length;
      } catch {
        // file unreadable — skip
      }
    }

    return sections.join('\n');
  }

  private buildHeader(repoName: string, fileCount: number, deps: Dependencies): string {
    return [
      `# Repository: ${repoName}`,
      `Language: ${deps.language}`,
      `Total text files: ${fileCount}`,
      deps.packageManager ? `Package manager: ${deps.packageManager}` : '',
      '',
    ].filter(l => l !== undefined).join('\n');
  }

  private buildTree(files: WalkedFile[]): string {
    const dirs = new Set<string>();
    for (const f of files) {
      const parts = f.relativePath.split('/');
      for (let i = 1; i < parts.length; i++) {
        dirs.add(parts.slice(0, i).join('/'));
      }
    }

    const lines = ['## Directory Structure\n'];
    for (const dir of [...dirs].sort().slice(0, 50)) {
      const depth = dir.split('/').length - 1;
      lines.push('  '.repeat(depth) + '├── ' + dir.split('/').pop() + '/');
    }
    lines.push('');
    return lines.join('\n');
  }

  private buildDepsSection(deps: Dependencies): string {
    const runtimeEntries = Object.entries(deps.runtime).slice(0, 30);
    if (runtimeEntries.length === 0) return '';

    const lines = ['## Dependencies\n'];
    for (const [name, version] of runtimeEntries) {
      lines.push(`- ${name}: ${version}`);
    }
    lines.push('');
    return lines.join('\n');
  }
}
