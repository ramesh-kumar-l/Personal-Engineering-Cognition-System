import { describe, it, expect } from 'vitest';
import { isTextFile, filePriority } from '../../src/scanner/LanguageDetector';
import { ContextBuilder } from '../../src/scanner/ContextBuilder';
import type { WalkedFile } from '../../src/scanner/FileWalker';
import type { Dependencies } from '../../src/scanner/DependencyParser';
import { DependencyParser } from '../../src/scanner/DependencyParser';
import * as path from 'path';

describe('LanguageDetector', () => {
  describe('isTextFile', () => {
    it('recognizes common text extensions', () => {
      expect(isTextFile('.ts')).toBe(true);
      expect(isTextFile('.py')).toBe(true);
      expect(isTextFile('.go')).toBe(true);
      expect(isTextFile('.md')).toBe(true);
      expect(isTextFile('.json')).toBe(true);
      expect(isTextFile('.yaml')).toBe(true);
    });

    it('rejects binary extensions', () => {
      expect(isTextFile('.png')).toBe(false);
      expect(isTextFile('.exe')).toBe(false);
      expect(isTextFile('.dll')).toBe(false);
      expect(isTextFile('.zip')).toBe(false);
    });

    it('is case insensitive', () => {
      expect(isTextFile('.TS')).toBe(true);
      expect(isTextFile('.PY')).toBe(true);
    });
  });

  describe('filePriority', () => {
    it('gives highest priority to root-level manifest files', () => {
      const packageJson = filePriority('package.json');
      const deepFile = filePriority('src/utils/helpers/deep.ts');
      expect(packageJson).toBeGreaterThan(deepFile);
    });

    it('gives higher priority to root files over nested files', () => {
      const root = filePriority('index.ts');
      const nested = filePriority('src/utils/helper.ts');
      expect(root).toBeGreaterThan(nested);
    });

    it('gives lower priority to test files', () => {
      const src = filePriority('src/storage.ts');
      const test = filePriority('test/unit/storage.test.ts');
      expect(src).toBeGreaterThan(test);
    });
  });
});

describe('ContextBuilder', () => {
  const builder = new ContextBuilder();

  function makeFile(relativePath: string, sizeBytes = 100): WalkedFile {
    return {
      relativePath,
      absolutePath: `/root/${relativePath}`,
      sizeBytes,
      extension: path.extname(relativePath),
    };
  }

  const deps: Dependencies = {
    language: 'TypeScript',
    runtime: { express: '^4.18.0', zod: '^3.22.0' },
    dev: { typescript: '^5.0.0' },
    packageManager: 'npm',
  };

  it('builds context within budget', async () => {
    const files = [makeFile('package.json'), makeFile('src/index.ts')];
    // Files don't exist on disk — ContextBuilder will skip unreadable files
    const context = await builder.build('/root', files, deps, 1000);
    expect(context).toBeTruthy();
    expect(context.length).toBeLessThanOrEqual(1500); // some slack for headers
  });

  it('includes repo name in header', async () => {
    const context = await builder.build('/root/my-project', [], deps, 5000);
    expect(context).toContain('my-project');
  });

  it('includes dependency information', async () => {
    const context = await builder.build('/root', [], deps, 5000);
    expect(context).toContain('express');
    expect(context).toContain('TypeScript');
  });
});

describe('DependencyParser', () => {
  const parser = new DependencyParser();
  const fixtureRoot = path.join(__dirname, '../fixtures/sample-repo');

  it('parses package.json dependencies', async () => {
    const deps = await parser.parse(fixtureRoot);
    expect(deps.language).toBe('TypeScript/JavaScript');
    expect(deps.runtime).toHaveProperty('express');
    expect(deps.runtime).toHaveProperty('zod');
    expect(deps.dev).toHaveProperty('typescript');
  });

  it('returns empty deps for directory without manifest', async () => {
    const deps = await parser.parse('/nonexistent/path');
    expect(deps.language).toBe('unknown');
    expect(deps.runtime).toEqual({});
  });
});
