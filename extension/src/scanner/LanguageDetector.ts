const TEXT_EXTENSIONS = new Set([
  // JavaScript / TypeScript
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.mts', '.cts',
  // Python
  '.py', '.pyw',
  // Go
  '.go',
  // Rust
  '.rs',
  // Ruby
  '.rb',
  // Java / Kotlin / Scala
  '.java', '.kt', '.kts', '.scala',
  // C / C++ / C#
  '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.cs',
  // PHP
  '.php',
  // Swift
  '.swift',
  // Shell
  '.sh', '.bash', '.zsh', '.fish',
  // Config / Data
  '.json', '.jsonc', '.yaml', '.yml', '.toml', '.ini', '.env',
  '.xml', '.html', '.htm', '.css', '.scss', '.sass', '.less',
  // Docs
  '.md', '.mdx', '.rst', '.txt',
  // Templates
  '.hbs', '.handlebars', '.ejs', '.njk', '.jinja', '.j2',
  // SQL
  '.sql',
  // Other text
  '.graphql', '.gql', '.proto', '.tf', '.hcl', '.Dockerfile',
]);

const PRIORITY_FILES = [
  'package.json', 'cargo.toml', 'pyproject.toml', 'go.mod',
  'readme.md', 'readme.txt', 'readme',
  'dockerfile', '.dockerignore',
  'makefile', 'justfile',
  'tsconfig.json', '.eslintrc.json', 'jest.config.ts', 'vite.config.ts',
];

export function isTextFile(ext: string): boolean {
  return TEXT_EXTENSIONS.has(ext.toLowerCase());
}

export function filePriority(relativePath: string): number {
  const basename = relativePath.split('/').pop()?.toLowerCase() ?? '';
  const ext = ('.' + basename.split('.').pop()).toLowerCase();

  // Highest priority: manifest and config files at root level
  if (PRIORITY_FILES.includes(basename) && !relativePath.includes('/')) return 100;
  if (PRIORITY_FILES.includes(basename)) return 80;

  // Root-level source files
  const depth = relativePath.split('/').length - 1;
  if (depth === 0) return 70;
  if (depth === 1) return 60;

  // Source directories beat test/fixture directories
  const isTestPath = /\/(test|tests|spec|specs|__tests__|fixtures|mocks|__mocks__)\//.test(relativePath);
  const baseScore = isTestPath ? 20 : 40;

  // Prioritize main source extensions
  if (['.ts', '.tsx', '.py', '.go', '.rs', '.java', '.kt'].includes(ext)) return baseScore + 10;
  if (['.js', '.jsx', '.rb', '.cs', '.swift'].includes(ext)) return baseScore + 5;

  return baseScore - depth;
}
