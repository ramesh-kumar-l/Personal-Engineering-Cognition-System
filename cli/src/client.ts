import type { PecsConfig } from './config';

export class PecsClient {
  constructor(private readonly config: PecsConfig) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.config.baseUrl}/api/v1${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.token}`,
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    return response.json() as Promise<T>;
  }

  get<T>(path: string): Promise<T> { return this.request<T>('GET', path); }
  post<T>(path: string, body: unknown): Promise<T> { return this.request<T>('POST', path, body); }
  del<T>(path: string): Promise<T> { return this.request<T>('DELETE', path); }

  async status(): Promise<unknown> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/status`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
}
