import * as vscode from 'vscode';
import type { SearchEngine } from '../search/SearchEngine';
import type { PecsPanel } from '../webview/PecsPanel';
import { getWorkspaceId } from '../utils/config';

export function registerSearchMemory(
  searchEngine: SearchEngine,
  panel: PecsPanel
): vscode.Disposable {
  return vscode.commands.registerCommand('pecs.searchMemory', async () => {
    const query = await vscode.window.showInputBox({
      prompt: 'Search engineering memory',
      placeHolder: 'e.g. "database connection timeout fix"',
    });

    if (!query) return;

    const workspaceId = getWorkspaceId();
    const results = await searchEngine.query(query, workspaceId);
    panel.postMessage({ type: 'searchResults', payload: results });
    panel.reveal();
  });
}
