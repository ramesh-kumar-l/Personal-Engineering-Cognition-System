import * as vscode from 'vscode';
import type { WorkflowStore } from '../storage/WorkflowStore';
import { WorkflowEngine, type WorkflowCallbacks } from '../workflow/WorkflowEngine';
import type { PecsPanel } from '../webview/PecsPanel';

export function registerRunWorkflow(
  workflowStore: WorkflowStore,
  engine: WorkflowEngine,
  panel: PecsPanel,
): vscode.Disposable {
  return vscode.commands.registerCommand('pecs.runWorkflow', async () => {
    const workflows = await workflowStore.getAll();
    if (workflows.length === 0) {
      vscode.window.showInformationMessage(
        'No workflows found. Use PECS: Create Workflow or PECS: Record Workflow first.'
      );
      return;
    }

    const items = workflows.map(w => ({
      label: w.name,
      description: `${w.stages.length} stage${w.stages.length !== 1 ? 's' : ''}`,
      detail: w.description,
      workflowId: w.id,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a workflow to run',
      matchOnDescription: true,
      matchOnDetail: true,
    });
    if (!selected) return;

    const workflow = workflows.find(w => w.id === selected.workflowId)!;
    panel.reveal();

    const callbacks: WorkflowCallbacks = {
      onStageStart: (idx, stageName) => {
        panel.postMessage({ type: 'loading', payload: { message: `Stage ${idx + 1}: ${stageName}` } });
      },
      onStepStart: (stageName, stepName) => {
        panel.postMessage({ type: 'loading', payload: { message: `${stageName} → ${stepName}…` } });
      },
      onStepComplete: () => {},
      onStepFailed: (_stageName, stepName, error) => {
        vscode.window.showWarningMessage(`PECS: Step "${stepName}" failed — ${error}`);
      },
      onProgress: (run) => panel.postMessage({ type: 'workflowProgress', payload: run }),
      onComplete: (run) => panel.postMessage({ type: 'workflowProgress', payload: run }),
      onCancelled: (run) => panel.postMessage({ type: 'workflowProgress', payload: run }),
    };

    await engine.start(workflow, callbacks);
  });
}
