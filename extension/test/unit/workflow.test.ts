import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowRecorder } from '../../src/workflow/WorkflowRecorder';
import { WorkflowEngine, type ApprovalGate, type ManualStepGate } from '../../src/workflow/WorkflowEngine';
import type { Memory, Workflow, WorkflowRun, WorkflowStage } from '../../src/storage/schema';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

function makeMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: crypto.randomUUID(),
    workspaceId: 'ws-test',
    type: 'note',
    title: 'Test memory',
    content: 'Test content',
    tags: ['tag1'],
    createdAt: new Date('2026-01-15T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-15T10:00:00Z').toISOString(),
    ...overrides,
  };
}

function makeWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: 'Test Workflow',
    description: 'A test playbook',
    tags: [],
    stages: [],
    createdAt: now,
    updatedAt: now,
    runs: [],
    ...overrides,
  };
}

function makeStage(overrides: Partial<WorkflowStage> = {}): WorkflowStage {
  return {
    id: crypto.randomUUID(),
    name: 'Stage 1',
    steps: [],
    requiresApproval: false,
    ...overrides,
  };
}

function makeRun(workflowId: string, overrides: Partial<WorkflowRun> = {}): WorkflowRun {
  return {
    id: crypto.randomUUID(),
    workflowId,
    status: 'running',
    currentStageIndex: 0,
    stepResults: [],
    context: {},
    startedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ─── WorkflowStore mock ────────────────────────────────────────────────────────

function makeWorkflowStoreMock() {
  const store: Workflow[] = [];
  return {
    addRun: vi.fn(async (workflowId: string, run: WorkflowRun) => {
      const w = store.find(x => x.id === workflowId);
      if (w) w.runs.push(run);
    }),
    updateRun: vi.fn(async () => {}),
    _store: store,
  };
}

// ─── WorkflowRecorder ─────────────────────────────────────────────────────────

describe('WorkflowRecorder', () => {
  it('creates empty stages array for empty memories', () => {
    const data = WorkflowRecorder.fromMemories([], 'Empty', '');
    expect(data.stages).toHaveLength(0);
    expect(data.name).toBe('Empty');
    expect(data.recordedFromMemoryIds).toHaveLength(0);
  });

  it('groups memories by date into stages', () => {
    const day1 = makeMemory({ createdAt: new Date('2026-01-15T09:00:00Z').toISOString(), title: 'M1' });
    const day2a = makeMemory({ createdAt: new Date('2026-01-16T09:00:00Z').toISOString(), title: 'M2a' });
    const day2b = makeMemory({ createdAt: new Date('2026-01-16T11:00:00Z').toISOString(), title: 'M2b' });

    const data = WorkflowRecorder.fromMemories([day1, day2a, day2b], 'Debug Session', 'How we debugged');

    expect(data.stages).toHaveLength(2);
    expect(data.stages[0].steps).toHaveLength(1);
    expect(data.stages[1].steps).toHaveLength(2);
  });

  it('creates manual steps from memory title and content', () => {
    const mem = makeMemory({ title: 'Fix auth bug', content: 'Root cause was JWT expiry' });
    const data = WorkflowRecorder.fromMemories([mem], 'Auth Fix', '');

    expect(data.stages[0].steps[0].name).toBe('Fix auth bug');
    expect(data.stages[0].steps[0].type).toBe('manual');
    expect(data.stages[0].steps[0].description).toContain('Root cause');
  });

  it('truncates long content to 200 chars with ellipsis', () => {
    const longContent = 'A'.repeat(250);
    const mem = makeMemory({ content: longContent });
    const data = WorkflowRecorder.fromMemories([mem], 'Test', '');

    const desc = data.stages[0].steps[0].description;
    expect(desc.length).toBeLessThanOrEqual(200);
    expect(desc.endsWith('…')).toBe(true);
  });

  it('deduplicates tags across memories', () => {
    const m1 = makeMemory({ tags: ['auth', 'backend'] });
    const m2 = makeMemory({ tags: ['auth', 'api'] });
    const data = WorkflowRecorder.fromMemories([m1, m2], 'Multi-tag', '');

    expect(data.tags).toContain('auth');
    expect(data.tags.filter(t => t === 'auth')).toHaveLength(1);
    expect(data.tags).toContain('backend');
    expect(data.tags).toContain('api');
  });

  it('records memory IDs for provenance', () => {
    const m1 = makeMemory();
    const m2 = makeMemory();
    const data = WorkflowRecorder.fromMemories([m1, m2], 'Provenance', '');

    expect(data.recordedFromMemoryIds).toEqual([m1.id, m2.id]);
  });
});

// ─── WorkflowEngine ───────────────────────────────────────────────────────────

describe('WorkflowEngine', () => {
  let storeMock: ReturnType<typeof makeWorkflowStoreMock>;
  let aiProviderMock: { complete: ReturnType<typeof vi.fn>; completeStream: ReturnType<typeof vi.fn>; isAvailable: ReturnType<typeof vi.fn>; readonly name: string };
  let approveAlways: ApprovalGate;
  let doneAlways: ManualStepGate;

  beforeEach(() => {
    storeMock = makeWorkflowStoreMock();
    aiProviderMock = {
      name: 'mock',
      complete: vi.fn().mockResolvedValue({ text: 'AI output', inputTokens: 10, outputTokens: 5 }),
      completeStream: vi.fn(),
      isAvailable: vi.fn().mockResolvedValue(true),
    };
    approveAlways = async () => true;
    doneAlways = async () => 'done';
  });

  function makeEngine() {
    return new WorkflowEngine(
      storeMock as unknown as import('../../src/storage/WorkflowStore').WorkflowStore,
      aiProviderMock as unknown as import('../../src/providers/AIProvider').AIProvider,
      approveAlways,
      doneAlways,
    );
  }

  it('calls addRun once with the correct workflowId', async () => {
    const engine = makeEngine();
    const workflow = makeWorkflow({ stages: [] });
    storeMock._store.push(workflow);

    const callbacks = {
      onStageStart: vi.fn(), onStepStart: vi.fn(), onStepComplete: vi.fn(),
      onStepFailed: vi.fn(), onProgress: vi.fn(), onComplete: vi.fn(), onCancelled: vi.fn(),
    };

    await engine.start(workflow, callbacks);
    expect(storeMock.addRun).toHaveBeenCalledOnce();
    expect(storeMock.addRun).toHaveBeenCalledWith(workflow.id, expect.objectContaining({ workflowId: workflow.id }));
  });

  it('completes immediately for a workflow with no stages', async () => {
    const engine = makeEngine();
    const workflow = makeWorkflow({ stages: [] });
    storeMock._store.push(workflow);

    const onComplete = vi.fn();
    const callbacks = {
      onStageStart: vi.fn(), onStepStart: vi.fn(), onStepComplete: vi.fn(),
      onStepFailed: vi.fn(), onProgress: vi.fn(), onComplete, onCancelled: vi.fn(),
    };

    await engine.start(workflow, callbacks);
    // Wait for fire-and-forget
    await new Promise(r => setTimeout(r, 10));

    expect(onComplete).toHaveBeenCalled();
    expect(storeMock.updateRun).toHaveBeenCalledWith(
      workflow.id, expect.any(String), expect.objectContaining({ status: 'completed' })
    );
  });

  it('executes manual steps via gate and marks completed', async () => {
    const engine = makeEngine();
    const stepId = crypto.randomUUID();
    const stage = makeStage({
      steps: [{ id: stepId, name: 'Manual step', description: 'Do this thing', type: 'manual', requiresApproval: false }],
    });
    const workflow = makeWorkflow({ stages: [stage] });
    storeMock._store.push(workflow);

    const onStepComplete = vi.fn();
    const callbacks = {
      onStageStart: vi.fn(), onStepStart: vi.fn(), onStepComplete,
      onStepFailed: vi.fn(), onProgress: vi.fn(),
      onComplete: vi.fn(), onCancelled: vi.fn(),
    };

    await engine.start(workflow, callbacks);
    await new Promise(r => setTimeout(r, 10));

    expect(onStepComplete).toHaveBeenCalledWith(stage.name, 'Manual step', undefined);
  });

  it('executes AI steps and stores output in context', async () => {
    const engine = makeEngine();
    const stepId = crypto.randomUUID();
    const stage = makeStage({
      steps: [{ id: stepId, name: 'AI step', description: 'Analyze this', type: 'ai', prompt: 'Analyze: {{topic}}', requiresApproval: false }],
    });
    const workflow = makeWorkflow({ stages: [stage] });
    storeMock._store.push(workflow);

    const onStepComplete = vi.fn();
    const callbacks = {
      onStageStart: vi.fn(), onStepStart: vi.fn(), onStepComplete,
      onStepFailed: vi.fn(), onProgress: vi.fn(), onComplete: vi.fn(), onCancelled: vi.fn(),
    };

    await engine.start(workflow, callbacks);
    await new Promise(r => setTimeout(r, 10));

    expect(aiProviderMock.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: 'user', content: 'Analyze: {{topic}}' }],
      })
    );
    expect(onStepComplete).toHaveBeenCalledWith(stage.name, 'AI step', 'AI output');
  });

  it('cancels workflow when approval gate returns false', async () => {
    const denyGate: ApprovalGate = async () => false;
    const engine = new WorkflowEngine(
      storeMock as unknown as import('../../src/storage/WorkflowStore').WorkflowStore,
      aiProviderMock as unknown as import('../../src/providers/AIProvider').AIProvider,
      denyGate,
      doneAlways,
    );

    const stage1 = makeStage({ name: 'Stage 1', steps: [] });
    const stage2 = makeStage({ name: 'Stage 2', requiresApproval: true, steps: [] });
    const workflow = makeWorkflow({ stages: [stage1, stage2] });
    storeMock._store.push(workflow);

    const onCancelled = vi.fn();
    const callbacks = {
      onStageStart: vi.fn(), onStepStart: vi.fn(), onStepComplete: vi.fn(),
      onStepFailed: vi.fn(), onProgress: vi.fn(), onComplete: vi.fn(), onCancelled,
    };

    await engine.start(workflow, callbacks);
    await new Promise(r => setTimeout(r, 10));

    expect(onCancelled).toHaveBeenCalled();
    expect(storeMock.updateRun).toHaveBeenCalledWith(
      workflow.id, expect.any(String), expect.objectContaining({ status: 'cancelled' })
    );
  });

  it('skips already-completed steps when resuming', async () => {
    const engine = makeEngine();
    const stepId = crypto.randomUUID();
    const stage = makeStage({
      steps: [{ id: stepId, name: 'Completed step', description: 'Done', type: 'manual', requiresApproval: false }],
    });
    const workflow = makeWorkflow({ stages: [stage] });
    storeMock._store.push(workflow);

    const run = makeRun(workflow.id, {
      stepResults: [{ stepId, status: 'completed', startedAt: new Date().toISOString() }],
    });

    const manualGate = vi.fn<ManualStepGate>().mockResolvedValue('done');
    const engineWithSpy = new WorkflowEngine(
      storeMock as unknown as import('../../src/storage/WorkflowStore').WorkflowStore,
      aiProviderMock as unknown as import('../../src/providers/AIProvider').AIProvider,
      approveAlways,
      manualGate,
    );

    // Simulate resume by setting existing step result
    const callbacks = {
      onStageStart: vi.fn(), onStepStart: vi.fn(), onStepComplete: vi.fn(),
      onStepFailed: vi.fn(), onProgress: vi.fn(), onComplete: vi.fn(), onCancelled: vi.fn(),
    };

    // Inject pre-existing step results by starting with a run that has completed steps
    workflow.runs.push(run);
    await engineWithSpy['executeRun'](workflow, run, callbacks);

    // Manual gate should NOT be called since step was already completed
    expect(manualGate).not.toHaveBeenCalled();
  });

  it('interpolates template variables in AI prompts', () => {
    const engine = makeEngine();
    const result = engine.interpolate('Hello {{name}}, topic is {{topic}}', { name: 'Alice', topic: 'testing' });
    expect(result).toBe('Hello Alice, topic is testing');
  });

  it('leaves unresolved variables as-is', () => {
    const engine = makeEngine();
    const result = engine.interpolate('Value: {{missing}}', {});
    expect(result).toBe('Value: {{missing}}');
  });
});
