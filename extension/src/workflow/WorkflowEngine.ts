import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import type { AIProvider } from '../providers/AIProvider';
import type { Workflow, WorkflowRun, WorkflowStage, WorkflowStep, WorkflowStepResult } from '../storage/schema';
import type { WorkflowStore } from '../storage/WorkflowStore';

export type WorkflowCallbacks = {
  onStageStart(stageIdx: number, stageName: string): void;
  onStepStart(stageName: string, stepName: string): void;
  onStepComplete(stageName: string, stepName: string, output?: string): void;
  onStepFailed(stageName: string, stepName: string, error: string): void;
  onProgress(run: WorkflowRun): void;
  onComplete(run: WorkflowRun): void;
  onCancelled(run: WorkflowRun): void;
};

// Injected gates make WorkflowEngine testable without VS Code
export type ApprovalGate = (title: string, message: string) => Promise<boolean>;
export type ManualStepGate = (stepName: string, description: string) => Promise<'done' | 'skip'>;

const vsCodeApprovalGate: ApprovalGate = async (title, message) => {
  const choice = await vscode.window.showInformationMessage(
    `${title}\n\n${message}`,
    { modal: true },
    'Approve',
    'Cancel'
  );
  return choice === 'Approve';
};

const vsCodeManualStepGate: ManualStepGate = async (stepName, description) => {
  const choice = await vscode.window.showInformationMessage(
    `Manual step: ${stepName}\n\n${description}`,
    { modal: true },
    'Mark Done',
    'Skip'
  );
  return choice === 'Mark Done' ? 'done' : 'skip';
};

export class WorkflowEngine {
  constructor(
    private readonly workflowStore: WorkflowStore,
    private readonly aiProvider: AIProvider,
    private readonly approvalGate: ApprovalGate = vsCodeApprovalGate,
    private readonly manualStepGate: ManualStepGate = vsCodeManualStepGate,
  ) {}

  async start(workflow: Workflow, callbacks: WorkflowCallbacks): Promise<WorkflowRun> {
    const run: WorkflowRun = {
      id: uuidv4(),
      workflowId: workflow.id,
      status: 'running',
      currentStageIndex: 0,
      stepResults: [],
      context: {},
      startedAt: new Date().toISOString(),
    };
    await this.workflowStore.addRun(workflow.id, run);
    // Fire-and-forget; errors are caught and stored in run state
    this.executeRun(workflow, run, callbacks).catch(() => undefined);
    return run;
  }

  private async executeRun(workflow: Workflow, run: WorkflowRun, cbs: WorkflowCallbacks): Promise<void> {
    try {
      for (let si = run.currentStageIndex; si < workflow.stages.length; si++) {
        const stage = workflow.stages[si];

        if (si > 0 && stage.requiresApproval) {
          const approved = await this.approvalGate(
            `Stage: ${stage.name}`,
            stage.description ?? 'Proceed to this stage?'
          );
          if (!approved) {
            await this.finishRun(workflow.id, run, 'cancelled', cbs);
            return;
          }
        }

        cbs.onStageStart(si, stage.name);
        run.currentStageIndex = si;
        await this.workflowStore.updateRun(workflow.id, run.id, { currentStageIndex: si });

        const cancelled = await this.executeStage(stage, workflow, run, cbs);
        if (cancelled) return;
      }

      await this.finishRun(workflow.id, run, 'completed', cbs);
      vscode.window.showInformationMessage(`PECS: Workflow "${workflow.name}" completed successfully.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      run.status = 'failed';
      run.completedAt = new Date().toISOString();
      await this.workflowStore.updateRun(workflow.id, run.id, {
        status: 'failed',
        completedAt: run.completedAt,
      });
      vscode.window.showErrorMessage(`PECS: Workflow "${workflow.name}" failed — ${msg}`);
    }
  }

  // Returns true if the run was cancelled
  private async executeStage(
    stage: WorkflowStage,
    workflow: Workflow,
    run: WorkflowRun,
    cbs: WorkflowCallbacks
  ): Promise<boolean> {
    for (const step of stage.steps) {
      const existing = run.stepResults.find(r => r.stepId === step.id);
      if (existing?.status === 'completed' || existing?.status === 'skipped') continue;

      if (step.requiresApproval) {
        const approved = await this.approvalGate(`Step: ${step.name}`, step.description);
        if (!approved) {
          await this.finishRun(workflow.id, run, 'cancelled', cbs);
          return true;
        }
      }

      cbs.onStepStart(stage.name, step.name);
      const result = await this.executeStep(step, run);

      this.upsertStepResult(run, result);
      await this.workflowStore.updateRun(workflow.id, run.id, { stepResults: run.stepResults });
      cbs.onProgress(run);

      if (result.status === 'failed') {
        cbs.onStepFailed(stage.name, step.name, result.error ?? 'Unknown error');
        const choice = await vscode.window.showErrorMessage(
          `PECS: Step "${step.name}" failed — ${result.error}`,
          'Skip & Continue',
          'Cancel Workflow'
        );
        if (choice === 'Skip & Continue') {
          result.status = 'skipped';
          this.upsertStepResult(run, result);
          await this.workflowStore.updateRun(workflow.id, run.id, { stepResults: run.stepResults });
        } else {
          await this.finishRun(workflow.id, run, 'cancelled', cbs);
          return true;
        }
      } else {
        cbs.onStepComplete(stage.name, step.name, result.output);
      }
    }
    return false;
  }

  private async executeStep(step: WorkflowStep, run: WorkflowRun): Promise<WorkflowStepResult> {
    const startedAt = new Date().toISOString();
    try {
      if (step.type === 'ai') {
        const output = await this.executeAiStep(step, run);
        run.context[`step.${step.id}.output`] = output;
        return { stepId: step.id, status: 'completed', output, startedAt, completedAt: new Date().toISOString() };
      }

      if (step.type === 'manual') {
        const decision = await this.manualStepGate(step.name, step.description);
        const status = decision === 'done' ? 'completed' : 'skipped';
        return { stepId: step.id, status, startedAt, completedAt: new Date().toISOString() };
      }

      if (step.type === 'command' && step.commandId) {
        await vscode.commands.executeCommand(step.commandId);
        return { stepId: step.id, status: 'completed', startedAt, completedAt: new Date().toISOString() };
      }

      return { stepId: step.id, status: 'skipped', startedAt };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { stepId: step.id, status: 'failed', error, startedAt, completedAt: new Date().toISOString() };
    }
  }

  private async executeAiStep(step: WorkflowStep, run: WorkflowRun): Promise<string> {
    const prompt = this.interpolate(step.prompt ?? step.description, run.context);
    const result = await this.aiProvider.complete({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 2048,
    });
    return result.text;
  }

  // Replaces {{key}} with run.context[key], leaving unresolved keys as-is
  interpolate(template: string, context: Record<string, string>): string {
    return template.replace(/\{\{([\w.]+)\}\}/g, (_, key) => context[key] ?? `{{${key}}}`);
  }

  private async finishRun(
    workflowId: string,
    run: WorkflowRun,
    status: WorkflowRun['status'],
    cbs: WorkflowCallbacks
  ): Promise<void> {
    run.status = status;
    run.completedAt = new Date().toISOString();
    await this.workflowStore.updateRun(workflowId, run.id, { status, completedAt: run.completedAt });
    if (status === 'completed') cbs.onComplete(run);
    else cbs.onCancelled(run);
  }

  private upsertStepResult(run: WorkflowRun, result: WorkflowStepResult): void {
    const idx = run.stepResults.findIndex(r => r.stepId === result.stepId);
    if (idx === -1) run.stepResults.push(result);
    else run.stepResults[idx] = result;
  }
}
