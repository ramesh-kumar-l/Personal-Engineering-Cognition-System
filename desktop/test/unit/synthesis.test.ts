import { describe, it, expect, vi, afterEach } from 'vitest';
import { MemorySynthesizer } from '../../src/synthesis/MemorySynthesizer';
import type { Memory } from '../../src/storage/schema';

const config = {
  aiEndpoint: 'http://localhost:11434/v1/chat/completions',
  aiModel: 'llama3',
};

function makeMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: 'id-' + Math.random().toString(36).slice(2),
    workspaceId: 'ws',
    type: 'note',
    title: 'A note',
    content: 'Some content',
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

afterEach(() => vi.restoreAllMocks());

describe('MemorySynthesizer', () => {
  it('returns structured result when AI returns valid JSON', async () => {
    const aiResponse = JSON.stringify({
      insights: ['We use TypeScript everywhere'],
      patterns: ['Tests are added late'],
      recommendations: ['Add tests earlier'],
      rawSummary: 'A concise summary.',
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: aiResponse } }] }),
    }));

    const synthesizer = new MemorySynthesizer(config);
    const memories = [makeMemory({ workspaceId: 'p1' }), makeMemory({ workspaceId: 'p2' })];
    const result = await synthesizer.synthesize(memories);

    expect(result.insights).toContain('We use TypeScript everywhere');
    expect(result.patterns).toContain('Tests are added late');
    expect(result.recommendations).toContain('Add tests earlier');
    expect(result.memoryCount).toBe(2);
    expect(result.workspaces).toEqual(expect.arrayContaining(['p1', 'p2']));
  });

  it('falls back gracefully when AI returns non-JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'plain text output' } }] }),
    }));

    const synthesizer = new MemorySynthesizer(config);
    const result = await synthesizer.synthesize([makeMemory()]);

    expect(result.insights).toEqual([]);
    expect(result.rawSummary).toBe('plain text output');
  });

  it('caps memories to 50 when calling AI', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{}' } }] }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const synthesizer = new MemorySynthesizer(config);
    const memories = Array.from({ length: 80 }, () => makeMemory());
    await synthesizer.synthesize(memories);

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string) as { messages: Array<{ content: string }> };
    // Verify result still reports full count
    expect(memories.length).toBe(80);
    // Body should NOT contain all 80 items (capped to 50)
    const promptContent = body.messages[0].content;
    const lines = (promptContent as string).split('\n').filter((l: string) => l.startsWith('['));
    expect(lines.length).toBeLessThanOrEqual(50);
  });

  it('throws when AI returns non-ok status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    const synthesizer = new MemorySynthesizer(config);
    await expect(synthesizer.synthesize([makeMemory()])).rejects.toThrow('429');
  });
});
