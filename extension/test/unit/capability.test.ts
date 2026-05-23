import { describe, it, expect } from 'vitest';
import { TechnologyTracker } from '../../src/capability/TechnologyTracker';
import { WorkflowMetricsCalculator } from '../../src/capability/WorkflowMetricsCalculator';
import { CapabilityReportBuilder } from '../../src/capability/CapabilityReportBuilder';
import type { Memory, Workflow, CapabilitySnapshot, WorkflowMaturity } from '../../src/storage/schema';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

function makeMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: crypto.randomUUID(),
    workspaceId: 'ws-test',
    type: 'note',
    title: 'Test memory',
    content: 'Test content',
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: 'Test Workflow',
    description: 'desc',
    tags: [],
    stages: [],
    createdAt: now,
    updatedAt: now,
    runs: [],
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<CapabilitySnapshot> = {}): CapabilitySnapshot {
  const maturity: WorkflowMaturity = {
    totalWorkflows: 0, totalRuns: 0, successRate: 0,
    avgStagesPerWorkflow: 0, avgStepsPerWorkflow: 0,
  };
  return {
    id: crypto.randomUUID(),
    capturedAt: new Date().toISOString(),
    technologies: [],
    workflowMaturity: maturity,
    memoryCount: 0,
    workspaceIds: [],
    ...overrides,
  };
}

// ─── TechnologyTracker ────────────────────────────────────────────────────────

describe('TechnologyTracker.detectFromText', () => {
  it('detects known language', () => {
    const result = TechnologyTracker.detectFromText('we use TypeScript for everything');
    expect(result.map(r => r.name)).toContain('TypeScript');
    expect(result.find(r => r.name === 'TypeScript')?.category).toBe('language');
  });

  it('detects known framework', () => {
    const result = TechnologyTracker.detectFromText('built with React and Next.js');
    const names = result.map(r => r.name);
    expect(names).toContain('React');
  });

  it('detects known tool', () => {
    const result = TechnologyTracker.detectFromText('using Docker and Kubernetes');
    const names = result.map(r => r.name);
    expect(names).toContain('Docker');
    expect(names).toContain('Kubernetes');
  });

  it('is case-insensitive', () => {
    const result = TechnologyTracker.detectFromText('TYPESCRIPT is great');
    expect(result.map(r => r.name)).toContain('TypeScript');
  });

  it('deduplicates within a single text', () => {
    const result = TechnologyTracker.detectFromText('TypeScript TypeScript TypeScript');
    expect(result.filter(r => r.name === 'TypeScript')).toHaveLength(1);
  });

  it('returns empty for unknown text', () => {
    const result = TechnologyTracker.detectFromText('no known technologies here at all xyz123');
    expect(result).toHaveLength(0);
  });

  it('passes context tags to detected technologies', () => {
    const result = TechnologyTracker.detectFromText('using React', ['frontend']);
    expect(result.find(r => r.name === 'React')?.tags).toContain('frontend');
  });
});

describe('TechnologyTracker.detectFromMemories', () => {
  it('extracts technologies from memory title and content', () => {
    const mem = makeMemory({ title: 'Docker setup', content: 'ran into issues with Docker compose' });
    const result = TechnologyTracker.detectFromMemories([mem]);
    expect(result.map(r => r.name)).toContain('Docker');
  });

  it('merges tags across memories mentioning same technology', () => {
    const m1 = makeMemory({ content: 'TypeScript setup', tags: ['backend'] });
    const m2 = makeMemory({ content: 'TypeScript types', tags: ['frontend'] });
    const result = TechnologyTracker.detectFromMemories([m1, m2]);
    const ts = result.find(r => r.name === 'TypeScript');
    expect(ts?.tags).toContain('backend');
    expect(ts?.tags).toContain('frontend');
  });

  it('deduplicates across memories', () => {
    const m1 = makeMemory({ content: 'React app' });
    const m2 = makeMemory({ content: 'React component' });
    const result = TechnologyTracker.detectFromMemories([m1, m2]);
    expect(result.filter(r => r.name === 'React')).toHaveLength(1);
  });
});

describe('TechnologyTracker.detectFromTechStack', () => {
  it('detects from tech stack array', () => {
    const result = TechnologyTracker.detectFromTechStack(['TypeScript', 'PostgreSQL'], '');
    const names = result.map(r => r.name);
    expect(names).toContain('TypeScript');
    expect(names).toContain('PostgreSQL');
  });

  it('detects from architecture text', () => {
    const result = TechnologyTracker.detectFromTechStack([], 'We use Redis for caching');
    expect(result.map(r => r.name)).toContain('Redis');
  });
});

// ─── WorkflowMetricsCalculator ────────────────────────────────────────────────

describe('WorkflowMetricsCalculator.compute', () => {
  it('returns zeroed metrics for no workflows', () => {
    const result = WorkflowMetricsCalculator.compute([]);
    expect(result.totalWorkflows).toBe(0);
    expect(result.totalRuns).toBe(0);
    expect(result.successRate).toBe(0);
  });

  it('counts total runs across all workflows', () => {
    const w1 = makeWorkflow({ runs: [{ id: '1', workflowId: 'w1', status: 'completed', currentStageIndex: 0, stepResults: [], context: {}, startedAt: new Date().toISOString() }] });
    const w2 = makeWorkflow({ runs: [
      { id: '2', workflowId: 'w2', status: 'failed', currentStageIndex: 0, stepResults: [], context: {}, startedAt: new Date().toISOString() },
      { id: '3', workflowId: 'w2', status: 'completed', currentStageIndex: 0, stepResults: [], context: {}, startedAt: new Date().toISOString() },
    ]});
    const result = WorkflowMetricsCalculator.compute([w1, w2]);
    expect(result.totalRuns).toBe(3);
    expect(result.successRate).toBeCloseTo(2 / 3, 2);
  });

  it('computes correct success rate (100% when all succeed)', () => {
    const w = makeWorkflow({ runs: [
      { id: '1', workflowId: 'w', status: 'completed', currentStageIndex: 0, stepResults: [], context: {}, startedAt: new Date().toISOString() },
      { id: '2', workflowId: 'w', status: 'completed', currentStageIndex: 0, stepResults: [], context: {}, startedAt: new Date().toISOString() },
    ]});
    const result = WorkflowMetricsCalculator.compute([w]);
    expect(result.successRate).toBe(1);
  });

  it('identifies most-run workflow', () => {
    const w1 = makeWorkflow({ name: 'Quiet', runs: [] });
    const w2 = makeWorkflow({ name: 'Busy' });
    const now = new Date().toISOString();
    w2.runs.push(
      { id: '1', workflowId: w2.id, status: 'completed', currentStageIndex: 0, stepResults: [], context: {}, startedAt: now },
      { id: '2', workflowId: w2.id, status: 'completed', currentStageIndex: 0, stepResults: [], context: {}, startedAt: now },
    );
    const result = WorkflowMetricsCalculator.compute([w1, w2]);
    expect(result.mostRunWorkflowName).toBe('Busy');
  });

  it('computes avgStagesPerWorkflow', () => {
    const w1 = makeWorkflow({ stages: [{ id: '1', name: 'S1', steps: [], requiresApproval: false }] });
    const w2 = makeWorkflow({ stages: [
      { id: '2', name: 'S2', steps: [], requiresApproval: false },
      { id: '3', name: 'S3', steps: [], requiresApproval: false },
    ]});
    const result = WorkflowMetricsCalculator.compute([w1, w2]);
    expect(result.avgStagesPerWorkflow).toBe(1.5);
  });
});

// ─── CapabilityReportBuilder ──────────────────────────────────────────────────

describe('CapabilityReportBuilder.buildMarkdown', () => {
  it('includes report title and technology count', () => {
    const snapshot = makeSnapshot({
      technologies: [
        { id: '1', name: 'TypeScript', category: 'language', firstSeenAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(), exposureCount: 5, workspaceIds: ['ws1'], tags: [] },
      ],
    });
    const md = CapabilityReportBuilder.buildMarkdown(snapshot);
    expect(md).toContain('# Engineering Capability Report');
    expect(md).toContain('TypeScript');
    expect(md).toContain('5 mention');
  });

  it('reports zero workflows when none exist', () => {
    const snapshot = makeSnapshot();
    const md = CapabilityReportBuilder.buildMarkdown(snapshot);
    expect(md).toContain('No workflows defined yet');
  });

  it('reports workflow maturity when workflows exist', () => {
    const snapshot = makeSnapshot({
      workflowMaturity: {
        totalWorkflows: 3, totalRuns: 10, successRate: 0.9,
        avgStagesPerWorkflow: 2.5, avgStepsPerWorkflow: 4,
        mostRunWorkflowName: 'Deploy Pipeline',
      },
    });
    const md = CapabilityReportBuilder.buildMarkdown(snapshot);
    expect(md).toContain('3');
    expect(md).toContain('90%');
    expect(md).toContain('Deploy Pipeline');
  });

  it('groups technologies by category', () => {
    const snapshot = makeSnapshot({
      technologies: [
        { id: '1', name: 'Go', category: 'language', firstSeenAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(), exposureCount: 3, workspaceIds: ['ws1'], tags: [] },
        { id: '2', name: 'Docker', category: 'tool', firstSeenAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(), exposureCount: 2, workspaceIds: ['ws1'], tags: [] },
      ],
    });
    const md = CapabilityReportBuilder.buildMarkdown(snapshot);
    expect(md).toContain('### Languages');
    expect(md).toContain('### Tools');
  });
});

describe('CapabilityReportBuilder.buildSummaryLine', () => {
  it('returns a concise one-liner', () => {
    const snapshot = makeSnapshot({
      technologies: [
        { id: '1', name: 'TypeScript', category: 'language', firstSeenAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(), exposureCount: 1, workspaceIds: [], tags: [] },
      ],
      workflowMaturity: { totalWorkflows: 2, totalRuns: 5, successRate: 0.8, avgStagesPerWorkflow: 2, avgStepsPerWorkflow: 3 },
    });
    const line = CapabilityReportBuilder.buildSummaryLine(snapshot);
    expect(line).toContain('1 technology');
    expect(line).toContain('2 workflow');
    expect(line).toContain('80%');
  });
});
