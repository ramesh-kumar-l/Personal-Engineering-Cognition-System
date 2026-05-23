import * as vscode from 'vscode';
import type { RepoScanner } from '../scanner/RepoScanner';
import type { PecsPanel } from '../webview/PecsPanel';
import { AIProvider, AIProviderError } from '../providers/AIProvider';
import { getWorkspaceId, getWorkspaceRoot } from '../utils/config';

const ONBOARDING_SYSTEM = `You are a senior engineer writing onboarding documentation for a new team member.
Write clear, practical documentation that helps someone get productive quickly.
Focus on: what the system does, how to set it up, key concepts, gotchas, and where to start.`;

function buildOnboardingPrompt(summary: {
  architecture: string;
  keyModules: Array<{ name: string; purpose: string }>;
  techStack: string[];
  dependencies: Record<string, string>;
}): string {
  const modules = summary.keyModules.map(m => `- **${m.name}**: ${m.purpose}`).join('\n');
  const stack = summary.techStack.join(', ');
  const topDeps = Object.entries(summary.dependencies).slice(0, 10)
    .map(([k, v]) => `- ${k}: ${v}`).join('\n');

  return `Based on this repository analysis, write a comprehensive ONBOARDING.md document.

## Repository Analysis
**Architecture:** ${summary.architecture}

**Tech Stack:** ${stack}

**Key Modules:**
${modules}

**Key Dependencies:**
${topDeps}

Write the onboarding document in Markdown. Include:
1. ## Overview — what this system does (2-3 sentences)
2. ## Prerequisites — what tools/accounts are needed
3. ## Setup — step-by-step getting started
4. ## Architecture Overview — how the system is structured
5. ## Key Modules — what each major module/directory does
6. ## Development Workflow — common development tasks
7. ## Gotchas — non-obvious things new engineers should know

Be practical and specific. Avoid generic advice.`;
}

export function registerGenerateOnboarding(
  scanner: RepoScanner,
  provider: AIProvider,
  panel: PecsPanel
): vscode.Disposable {
  return vscode.commands.registerCommand('pecs.generateOnboarding', async () => {
    const root = getWorkspaceRoot();
    if (!root) {
      vscode.window.showErrorMessage('PECS: No workspace folder open.');
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'PECS: Generating onboarding document...',
        cancellable: false,
      },
      async (progress) => {
        try {
          progress.report({ message: 'Analyzing repository...' });
          const workspaceId = getWorkspaceId();
          const summary = await scanner.scan(root, workspaceId);

          progress.report({ message: 'Writing onboarding doc...' });
          const result = await provider.complete({
            messages: [{ role: 'user', content: buildOnboardingPrompt(summary) }],
            systemPrompt: ONBOARDING_SYSTEM,
            maxTokens: 4096,
            temperature: 0.3,
          });

          const doc = await vscode.workspace.openTextDocument({
            content: result.text,
            language: 'markdown',
          });
          await vscode.window.showTextDocument(doc);

          const save = await vscode.window.showInformationMessage(
            'PECS: Onboarding document generated!',
            'Save as ONBOARDING.md'
          );

          if (save) {
            const saveUri = vscode.Uri.joinPath(
              vscode.workspace.workspaceFolders![0].uri,
              'ONBOARDING.md'
            );
            await vscode.workspace.fs.writeFile(
              saveUri,
              Buffer.from(result.text, 'utf-8')
            );
          }
        } catch (err) {
          const msg = err instanceof AIProviderError
            ? `AI provider error: ${err.message}`
            : err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(`PECS: ${msg}`);
        }
      }
    );
  });
}
