import * as vscode from 'vscode';
import type { WorkflowStore } from '../storage/WorkflowStore';
import type { PecsPanel } from '../webview/PecsPanel';
import type { WorkflowListItem } from '../storage/schema';

export function registerListWorkflows(
  workflowStore: WorkflowStore,
  panel: PecsPanel,
): vscode.Disposable {
  return vscode.commands.registerCommand('pecs.listWorkflows', async () => {
    const workflows = await workflowStore.getAll();

    const items: WorkflowListItem[] = workflows.map(w => {
      const lastRun = w.runs.length > 0 ? w.runs[w.runs.length - 1] : undefined;
      return {
        id: w.id,
        name: w.name,
        description: w.description,
        tags: w.tags,
        stageCount: w.stages.length,
        stepCount: w.stages.reduce((acc, s) => acc + s.steps.length, 0),
        runCount: w.runs.length,
        lastRunAt: lastRun?.startedAt,
        lastRunStatus: lastRun?.status,
      };
    });

    panel.reveal();
    panel.postMessage({ type: 'workflowList', payload: items });
  });
}
