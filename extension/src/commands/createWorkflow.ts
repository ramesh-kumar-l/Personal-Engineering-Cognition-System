import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import type { WorkflowStore } from '../storage/WorkflowStore';
import type { WorkflowStage } from '../storage/schema';

export function registerCreateWorkflow(workflowStore: WorkflowStore): vscode.Disposable {
  return vscode.commands.registerCommand('pecs.createWorkflow', async () => {
    const name = await vscode.window.showInputBox({
      prompt: 'Workflow name',
      placeHolder: 'e.g. Deploy Feature, Debug Production Issue',
      validateInput: v => (v?.trim() ? undefined : 'Name is required'),
    });
    if (!name) return;

    const description = await vscode.window.showInputBox({
      prompt: 'Workflow description',
      placeHolder: 'What does this playbook accomplish?',
    }) ?? '';

    const stageCountStr = await vscode.window.showInputBox({
      prompt: 'How many stages? (1–8)',
      value: '1',
      validateInput: v => {
        const n = parseInt(v ?? '');
        return n >= 1 && n <= 8 ? undefined : 'Enter a number between 1 and 8';
      },
    });
    if (!stageCountStr) return;
    const stageCount = parseInt(stageCountStr);

    const stages: WorkflowStage[] = [];
    for (let i = 0; i < stageCount; i++) {
      const stageName = await vscode.window.showInputBox({
        prompt: `Stage ${i + 1} name`,
        placeHolder: 'e.g. Preparation, Execution, Verification',
        validateInput: v => (v?.trim() ? undefined : 'Stage name is required'),
      });
      if (!stageName) return;

      const stepsInput = await vscode.window.showInputBox({
        prompt: `Steps for "${stageName}" (comma-separated)`,
        placeHolder: 'e.g. Run tests, Update changelog, Deploy to staging',
      });
      if (stepsInput === undefined) return;

      const stepNames = stepsInput.split(',').map(s => s.trim()).filter(Boolean);
      if (stepNames.length === 0) stepNames.push('Step 1');

      stages.push({
        id: uuidv4(),
        name: stageName.trim(),
        requiresApproval: i > 0, // approval gate before each stage after the first
        steps: stepNames.map(stepName => ({
          id: uuidv4(),
          name: stepName,
          description: stepName,
          type: 'manual',
          requiresApproval: false,
        })),
      });
    }

    const workflow = await workflowStore.create({
      name: name.trim(),
      description: description.trim(),
      tags: [],
      stages,
    });

    vscode.window.showInformationMessage(
      `PECS: Workflow "${workflow.name}" created — ${stages.length} stage${stages.length !== 1 ? 's' : ''}.`
    );
  });
}
