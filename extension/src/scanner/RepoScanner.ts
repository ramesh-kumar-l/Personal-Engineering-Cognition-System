import * as vscode from 'vscode';
import * as path from 'path';
import type { AIProvider } from '../providers/AIProvider';
import { FileWalker } from './FileWalker';
import { DependencyParser } from './DependencyParser';
import { ContextBuilder } from './ContextBuilder';
import type { SummaryCache } from '../storage/SummaryCache';
import type { RepoSummary } from '../storage/schema';

const SYSTEM_PROMPT = `You are an expert software architect analyzing a code repository.
Analyze the provided repository context and produce a structured architecture summary.
Be concise, precise, and focus on what would be most useful for an engineer new to this codebase.`;

const USER_PROMPT_TEMPLATE = (context: string, repoName: string) => `
Analyze this repository: ${repoName}

${context}

Respond with a JSON object (no markdown, just JSON) with this exact shape:
{
  "architecture": "2-4 sentence description of what this system does and how it's structured",
  "keyModules": [
    { "name": "module/directory name", "purpose": "what it does in 1 sentence" }
  ],
  "techStack": ["technology1", "technology2"],
  "dependencies": { "key-dep-name": "version" }
}

Include at most 10 keyModules and 15 techStack items. For dependencies, include only the 10 most architecturally significant ones.
`;

export class RepoScanner {
  private fileWalker = new FileWalker();
  private depParser = new DependencyParser();
  private ctxBuilder = new ContextBuilder();

  constructor(
    private readonly provider: AIProvider,
    private readonly summaryCache: SummaryCache
  ) {}

  async scan(rootPath: string, workspaceId: string): Promise<RepoSummary> {
    const cached = await this.summaryCache.get(workspaceId);
    if (cached) return cached;

    const cfg = vscode.workspace.getConfiguration('pecs');
    const maxFiles = cfg.get<number>('scanner.maxFilesPerScan', 500);
    const maxFileSizeKb = cfg.get<number>('scanner.maxFileSizeKb', 100);
    const excludePatterns = cfg.get<string[]>('scanner.excludePatterns', []);

    const [files, deps] = await Promise.all([
      this.fileWalker.walk(rootPath, {
        maxFiles,
        maxFileSizeBytes: maxFileSizeKb * 1024,
        excludePatterns,
      }),
      this.depParser.parse(rootPath),
    ]);

    const context = await this.ctxBuilder.build(rootPath, files, deps, 80_000);
    const repoName = path.basename(rootPath);

    const result = await this.provider.complete({
      messages: [
        { role: 'user', content: USER_PROMPT_TEMPLATE(context, repoName) },
      ],
      systemPrompt: SYSTEM_PROMPT,
      maxTokens: 2048,
      temperature: 0.1,
    });

    const parsed = this.parseAIResponse(result.text, workspaceId, deps, files.length, result);

    await this.summaryCache.set(workspaceId, parsed);
    return parsed;
  }

  private parseAIResponse(
    text: string,
    workspaceId: string,
    deps: { runtime: Record<string, string> },
    fileCount: number,
    result: { inputTokens?: number; outputTokens?: number; model?: string }
  ): RepoSummary {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');

      const data = JSON.parse(jsonMatch[0]) as {
        architecture?: string;
        keyModules?: Array<{ name: string; purpose: string }>;
        techStack?: string[];
        dependencies?: Record<string, string>;
      };

      return {
        workspaceId,
        generatedAt: new Date().toISOString(),
        architecture: data.architecture ?? 'Architecture analysis unavailable.',
        keyModules: data.keyModules ?? [],
        dependencies: data.dependencies ?? deps.runtime,
        techStack: data.techStack ?? [],
        fileCount,
        tokenCount: (result.inputTokens ?? 0) + (result.outputTokens ?? 0),
        model: result.model ?? 'unknown',
      };
    } catch {
      return {
        workspaceId,
        generatedAt: new Date().toISOString(),
        architecture: text.slice(0, 500),
        keyModules: [],
        dependencies: deps.runtime,
        techStack: [],
        fileCount,
        tokenCount: 0,
        model: result.model ?? 'unknown',
      };
    }
  }
}
