import * as vscode from 'vscode';
import type { SummaryCache } from '../storage/SummaryCache';
import { getWorkspaceId } from '../utils/config';

export function registerClearCache(summaryCache: SummaryCache): vscode.Disposable {
  return vscode.commands.registerCommand('pecs.clearCache', async () => {
    const workspaceId = getWorkspaceId();
    await summaryCache.clear(workspaceId);
    vscode.window.showInformationMessage('PECS: Repo summary cache cleared. Next summarize will re-scan.');
  });
}
