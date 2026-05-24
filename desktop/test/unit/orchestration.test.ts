import { describe, it, expect, vi, afterEach } from 'vitest';
import { AgentOrchestrator } from '../../src/orchestration/AgentOrchestrator';

const config = {
  aiEndpoint: 'http://localhost:11434/v1/chat/completions',
  aiModel: 'llama3',
};

function mockFetch(responses: string[]) {
  let call = 0;
  return vi.fn().mockImplementation(() => {
    const text = responses[call++] ?? '';
    return Promise.resolve({
      ok: true,
      json: async () => ({ choices: [{ message: { content: text } }] }),
    });
  });
}

afterEach(() => vi.restoreAllMocks());

describe('AgentOrchestrator', () => {
  it('calls AI four times: planner, executor(s), reviewer, synthesizer', async () => {
    const fetchSpy = mockFetch([
      '["step one", "step two"]',  // planner
      'Result for step one',        // executor 1
      'Result for step two',        // executor 2
      'Looks complete',             // reviewer
      'Final answer',               // synthesizer
    ]);
    vi.stubGlobal('fetch', fetchSpy);

    const orch = new AgentOrchestrator(config);
    const run = await orch.run('Do something');

    expect(run.plan).toEqual(['step one', 'step two']);
    expect(run.synthesis).toBe('Final answer');
    expect(run.results.length).toBe(3); // 2 executors + 1 reviewer
    expect(fetchSpy).toHaveBeenCalledTimes(5);
  });

  it('falls back to single step when planner returns non-JSON', async () => {
    const fetchSpy = mockFetch([
      'Just do the thing.',          // planner — not JSON
      'done',                        // executor
      'ok',                          // reviewer
      'summary',                     // synthesizer
    ]);
    vi.stubGlobal('fetch', fetchSpy);

    const orch = new AgentOrchestrator(config);
    const run = await orch.run('Simple goal');

    expect(run.plan).toHaveLength(1);
    expect(run.plan[0]).toBe('Just do the thing.');
  });

  it('includes memory context in the first AI call', async () => {
    const fetchSpy = mockFetch(['["step"]', 'out', 'review', 'synth']);
    vi.stubGlobal('fetch', fetchSpy);

    const memory = {
      id: '1', workspaceId: 'ws', type: 'note' as const,
      title: 'Important note', content: 'very relevant info',
      tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    const orch = new AgentOrchestrator(config);
    await orch.run('Goal', [memory]);

    const firstCallBody = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string) as { messages: Array<{ content: string }> };
    const userMsg = firstCallBody.messages.find(m => m.content.includes('Important note'));
    expect(userMsg).toBeTruthy();
  });

  it('throws when AI returns non-ok status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const orch = new AgentOrchestrator(config);
    await expect(orch.run('Goal')).rejects.toThrow('500');
  });

  it('caps plan to 5 steps', async () => {
    const manySteps = JSON.stringify(['s1', 's2', 's3', 's4', 's5', 's6', 's7']);
    const fetchSpy = mockFetch([
      manySteps,
      'r1', 'r2', 'r3', 'r4', 'r5', // 5 executors (capped)
      'review',
      'synth',
    ]);
    vi.stubGlobal('fetch', fetchSpy);

    const orch = new AgentOrchestrator(config);
    const run = await orch.run('Big goal');
    expect(run.plan.length).toBe(5);
  });
});
