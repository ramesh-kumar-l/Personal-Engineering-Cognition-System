import * as vscode from 'vscode';
import type { MemoryStore } from '../storage/MemoryStore';
import type { StalenessDetector } from '../memory/StalenessDetector';
import type { PecsPanel } from '../webview/PecsPanel';
import type { StalenessReport } from '../storage/schema';
import { getWorkspaceId, getWorkspaceRoot } from '../utils/config';

export function registerCheckStaleness(
  memoryStore: MemoryStore,
  detector: StalenessDetector,
  panel: PecsPanel
): vscode.Disposable {
  return vscode.commands.registerCommand('pecs.checkStaleness', async () => {
    const root = getWorkspaceRoot();
    if (!root) {
      vscode.window.showErrorMessage('PECS: No workspace folder open.');
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'PECS: Checking memory staleness...',
        cancellable: false,
      },
      async () => {
        const workspaceId = getWorkspaceId();
        const memories = await memoryStore.getAll(workspaceId);
        const withFiles = memories.filter(m => m.filePath);

        const statusMap = await detector.checkAll(withFiles, root);

        const now = new Date().toISOString();
        const updatePromises: Promise<unknown>[] = [];
        for (const [id, status] of statusMap) {
          updatePromises.push(memoryStore.update(id, { stalenessStatus: status, stalenessCheckedAt: now }));
        }
        await Promise.all(updatePromises);

        const values = [...statusMap.values()];
        const staleCount = values.filter(s => s === 'stale').length;
        const freshCount = values.filter(s => s === 'fresh').length;
        const unknownCount = values.filter(s => s === 'unknown').length;

        const staleMemories = memories
          .filter(m => statusMap.get(m.id) === 'stale')
          .map(m => ({ id: m.id, title: m.title, filePath: m.filePath }));

        const report: StalenessReport = {
          total: withFiles.length,
          fresh: freshCount,
          stale: staleCount,
          unknown: unknownCount,
          staleMemories,
        };

        panel.reveal();
        panel.postMessage({ type: 'stalenessReport', payload: report });

        vscode.window.showInformationMessage(
          `PECS: Staleness check complete — ${freshCount} fresh, ${staleCount} stale, ${unknownCount} unknown`
        );
      }
    );
  });
}
