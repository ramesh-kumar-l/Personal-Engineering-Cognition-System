import type { Memory } from '../storage/schema';

export interface SynthesisConfig {
  aiEndpoint: string;
  aiModel: string;
  apiKey?: string;
}

export interface SynthesisResult {
  insights: string[];
  patterns: string[];
  recommendations: string[];
  rawSummary: string;
  memoryCount: number;
  workspaces: string[];
}

async function callAI(config: SynthesisConfig, prompt: string): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const isAnthropic = config.aiEndpoint.includes('anthropic.com');

  if (config.apiKey) {
    headers[isAnthropic ? 'x-api-key' : 'Authorization'] = isAnthropic
      ? config.apiKey
      : `Bearer ${config.apiKey}`;
    if (isAnthropic) headers['anthropic-version'] = '2023-06-01';
  }

  const body = isAnthropic
    ? { model: config.aiModel, max_tokens: 2048, messages: [{ role: 'user', content: prompt }] }
    : { model: config.aiModel, messages: [{ role: 'user', content: prompt }] };

  const response = await fetch(config.aiEndpoint, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`AI synthesis call failed with HTTP ${response.status}`);

  const data = await response.json() as Record<string, unknown>;
  if (isAnthropic) {
    return ((data['content'] as Array<{ text: string }>)?.[0]?.text) ?? '';
  }
  return ((data['choices'] as Array<{ message: { content: string } }>)?.[0]?.message?.content) ?? '';
}

interface RawSynthesis {
  insights?: string[];
  patterns?: string[];
  recommendations?: string[];
  rawSummary?: string;
}

export class MemorySynthesizer {
  constructor(private readonly config: SynthesisConfig) {}

  async synthesize(memories: Memory[]): Promise<SynthesisResult> {
    const workspaces = [...new Set(memories.map(m => m.workspaceId))];
    // Cap to 50 memories to stay within token budget
    const sample = memories
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 50);

    const memText = sample
      .map(m => `[${m.type}|${m.workspaceId}] ${m.title}: ${m.content.slice(0, 300)}`)
      .join('\n');

    const prompt = `Analyze these engineering memories across ${workspaces.length} workspace(s) and extract structured knowledge.

Output strict JSON (no markdown fences) with this shape:
{"insights": [...], "patterns": [...], "recommendations": [...], "rawSummary": "..."}

- insights: what was concretely learned (3–6 items)
- patterns: recurring themes or behaviours (2–4 items)
- recommendations: actionable next steps (2–4 items)
- rawSummary: 2–3 sentence narrative

Memories:
${memText}`;

    const raw = await callAI(this.config, prompt);

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as RawSynthesis;
        return {
          insights: parsed.insights ?? [],
          patterns: parsed.patterns ?? [],
          recommendations: parsed.recommendations ?? [],
          rawSummary: parsed.rawSummary ?? raw,
          memoryCount: memories.length,
          workspaces,
        };
      } catch { /* fall through to raw */ }
    }

    return {
      insights: [],
      patterns: [],
      recommendations: [],
      rawSummary: raw,
      memoryCount: memories.length,
      workspaces,
    };
  }
}
