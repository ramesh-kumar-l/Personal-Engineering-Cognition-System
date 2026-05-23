import * as vscode from 'vscode';
import type { SearchEngine } from '../search/SearchEngine';
import type { PecsPanel } from '../webview/PecsPanel';

export function registerCrossWorkspaceSearch(
  searchEngine: SearchEngine,
  panel: PecsPanel
): vscode.Disposable {
  return vscode.commands.registerCommand('pecs.crossWorkspaceSearch', async () => {
    const query = await vscode.window.showInputBox({
      prompt: 'Search memories across all workspaces',
      placeHolder: 'Enter search query...',
    });
    if (!query) return;

    panel.reveal();
    panel.postMessage({ type: 'loading', payload: { message: 'Searching all workspaces…' } });

    try {
      const results = await searchEngine.queryAllWorkspaces(query);
      panel.postMessage({ type: 'searchResults', payload: results });
    } catch (err) {
      panel.postMessage({ type: 'error', payload: { message: String(err) } });
    }
  });
}
