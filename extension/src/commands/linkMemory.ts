import * as vscode from 'vscode';
import type { MemoryStore } from '../storage/MemoryStore';
import type { MemoryLinker } from '../memory/MemoryLinker';
import { getWorkspaceId } from '../utils/config';

export function registerLinkMemory(
  memoryStore: MemoryStore,
  linker: MemoryLinker
): vscode.Disposable {
  return vscode.commands.registerCommand('pecs.linkMemory', async () => {
    const workspaceId = getWorkspaceId();
    const memories = await memoryStore.getAll(workspaceId);

    if (memories.length < 2) {
      vscode.window.showInformationMessage('PECS: Need at least 2 memories to create a link.');
      return;
    }

    const toItem = (m: { id: string; title: string; type: string; createdAt: string }) => ({
      label: m.title,
      description: `${m.type} · ${new Date(m.createdAt).toLocaleDateString()}`,
      id: m.id,
    });

    const sourceItem = await vscode.window.showQuickPick(
      memories.map(toItem),
      { placeHolder: 'Select source memory' }
    );
    if (!sourceItem) return;

    const targetItem = await vscode.window.showQuickPick(
      memories.filter(m => m.id !== sourceItem.id).map(toItem),
      { placeHolder: 'Select memory to link to' }
    );
    if (!targetItem) return;

    const success = await linker.link(sourceItem.id, targetItem.id);
    if (success) {
      vscode.window.showInformationMessage(
        `PECS: Linked "${sourceItem.label}" ↔ "${targetItem.label}"`
      );
    }
  });
}
