import type { Workflow, WorkflowMaturity } from '../storage/schema';

export class WorkflowMetricsCalculator {
  static compute(workflows: Workflow[]): WorkflowMaturity {
    if (workflows.length === 0) {
      return { totalWorkflows: 0, totalRuns: 0, successRate: 0, avgStagesPerWorkflow: 0, avgStepsPerWorkflow: 0 };
    }

    const totalRuns = workflows.reduce((sum, w) => sum + w.runs.length, 0);
    const completedRuns = workflows.reduce(
      (sum, w) => sum + w.runs.filter(r => r.status === 'completed').length, 0,
    );
    const successRate = totalRuns > 0 ? completedRuns / totalRuns : 0;
    const avgStagesPerWorkflow = workflows.reduce((sum, w) => sum + w.stages.length, 0) / workflows.length;
    const avgStepsPerWorkflow =
      workflows.reduce((sum, w) => sum + w.stages.reduce((s, stage) => s + stage.steps.length, 0), 0) / workflows.length;

    let mostRunWorkflow: Workflow | undefined;
    let maxRuns = 0;
    for (const w of workflows) {
      if (w.runs.length > maxRuns) { maxRuns = w.runs.length; mostRunWorkflow = w; }
    }

    return {
      totalWorkflows: workflows.length, totalRuns,
      successRate: Math.round(successRate * 100) / 100,
      avgStagesPerWorkflow: Math.round(avgStagesPerWorkflow * 10) / 10,
      avgStepsPerWorkflow: Math.round(avgStepsPerWorkflow * 10) / 10,
      mostRunWorkflowId: mostRunWorkflow?.id,
      mostRunWorkflowName: mostRunWorkflow?.name,
    };
  }
}
