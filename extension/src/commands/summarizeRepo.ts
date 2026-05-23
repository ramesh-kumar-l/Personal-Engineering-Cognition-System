import * as vscode from 'vscode';
import type { RepoScanner } from '../scanner/RepoScanner';
import type { PecsPanel } from '../webview/PecsPanel';
import { getWorkspaceId, getWorkspaceRoot } from '../utils/config';
import { AIProviderError } from '../providers/AIProvider';

export function registerSummarizeRepo(
  scanner: RepoScanner,
  panel: PecsPanel
): vscode.Disposable {
  return vscode.commands.registerCommand('pecs.summarizeRepo', async () => {
    const root = getWorkspaceRoot();
    if (!root) {
      vscode.window.showErrorMessage('PECS: No workspace folder open.');
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'PECS: Analyzing repository...',
        cancellable: false,
      },
      async (progress) => {
        try {
          progress.report({ message: 'Walking files...' });
          const workspaceId = getWorkspaceId();
          const summary = await scanner.scan(root, workspaceId);
          panel.postMessage({ type: 'repoSummary', payload: summary });
          panel.reveal();
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
