import * as vscode from 'vscode';
import type { CapabilityStore } from '../storage/CapabilityStore';
import type { PecsPanel } from '../webview/PecsPanel';
import { CapabilityReportBuilder } from '../capability/CapabilityReportBuilder';

export function registerViewCapabilityReport(
  capabilityStore: CapabilityStore,
  panel: PecsPanel,
): vscode.Disposable {
  return vscode.commands.registerCommand('pecs.viewCapabilityReport', async () => {
    const snapshot = await capabilityStore.getLatestSnapshot();

    if (!snapshot) {
      const run = await vscode.window.showWarningMessage(
        'No capability data yet. Run "PECS: Track Capabilities" first.',
        'Track Now',
      );
      if (run === 'Track Now') {
        await vscode.commands.executeCommand('pecs.trackCapabilities');
      }
      return;
    }

    const markdown = CapabilityReportBuilder.buildMarkdown(snapshot);
    panel.postMessage({ type: 'capabilityReport', payload: { markdown, snapshot } });
    await vscode.commands.executeCommand('pecs.sidebarView.focus');
  });
}
