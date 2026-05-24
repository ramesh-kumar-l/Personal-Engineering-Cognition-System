import type { Memory } from '../storage/schema';

export class TeamClient {
  constructor(
    private readonly serverUrl: string,
    private readonly teamToken: string,
  ) {}

  async push(memories: Memory[], teamId: string): Promise<number> {
    const response = await fetch(`${this.serverUrl}/api/team/v1/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.teamToken}`,
      },
      body: JSON.stringify({ memories, teamId }),
    });
    if (!response.ok) throw new Error(`Team push failed: HTTP ${response.status}`);
    const data = await response.json() as { accepted: number };
    return data.accepted;
  }

  async pull(teamId: string, since?: string): Promise<Memory[]> {
    const params = new URLSearchParams({ teamId });
    if (since) params.set('since', since);
    const response = await fetch(`${this.serverUrl}/api/team/v1/pull?${params}`, {
      headers: { 'Authorization': `Bearer ${this.teamToken}` },
    });
    if (!response.ok) throw new Error(`Team pull failed: HTTP ${response.status}`);
    const data = await response.json() as { memories: Memory[] };
    return data.memories ?? [];
  }
}
