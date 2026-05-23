import * as vscode from 'vscode';
import type { MemoryStore } from '../storage/MemoryStore';
import type { WorkflowStore } from '../storage/WorkflowStore';
import { WorkflowRecorder } from '../workflow/WorkflowRecorder';

export function registerRecordWorkflow(
  memoryStore: MemoryStore,
  workflowStore: WorkflowStore,
  workspaceId: string,
): vscode.Disposable {
  return vscode.commands.registerCommand('pecs.recordWorkflow', async () => {
    const memories = await memoryStore.getAll(workspaceId);
    if (memories.length === 0) {
      vscode.window.showInformationMessage(
        'No memories to record. Use PECS: Record Engineering Memory first.'
      );
      return;
    }

    const sorted = [...memories].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const items = sorted.map(m => ({
      label: m.title,
      description: `${m.type} · ${new Date(m.createdAt).toLocaleDateString()}`,
      memoryId: m.id,
      picked: false,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select memories to include (space to toggle, enter to confirm)',
      canPickMany: true,
    });
    if (!selected || selected.length === 0) return;

    const selectedIds = new Set(selected.map(s => s.memoryId));
    const selectedMemories = sorted.filter(m => selectedIds.has(m.id));

    const name = await vscode.window.showInputBox({
      prompt: 'Workflow name',
      placeHolder: 'e.g. Debug Auth Issue, Feature Release Process',
      validateInput: v => (v?.trim() ? undefined : 'Name is required'),
    });
    if (!name) return;

    const description = await vscode.window.showInputBox({
      prompt: 'Workflow description',
      placeHolder: 'What process does this playbook capture?',
    }) ?? '';

    const data = WorkflowRecorder.fromMemories(selectedMemories, name.trim(), description.trim());
    const workflow = await workflowStore.create(data);

    vscode.window.showInformationMessage(
      `PECS: Workflow "${workflow.name}" recorded from ${selectedMemories.length} memor${selectedMemories.length !== 1 ? 'ies' : 'y'}.`
    );
  });
}
