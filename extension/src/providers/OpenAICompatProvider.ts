import { AIProvider, AIProviderError, type AICompletionOptions, type AICompletionResult, type AIEmbeddingResult } from './AIProvider';

type OpenAICompatConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

const TIMEOUT_MS = 30_000;

export class OpenAICompatProvider implements AIProvider {
  readonly name = 'openai-compat';

  constructor(private readonly config: OpenAICompatConfig) {}

  async complete(options: AICompletionOptions): Promise<AICompletionResult> {
    const messages = this.buildMessages(options);

    const body = JSON.stringify({
      model: this.config.model,
      messages,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.3,
      stream: false,
    });

    const response = await this.fetchWithTimeout(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body,
    });

    if (!response.ok) {
      throw this.mapHttpError(response.status, await response.text());
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number };
      model?: string;
    };

    return {
      text: data.choices[0]?.message?.content ?? '',
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
      model: data.model,
    };
  }

  async *completeStream(options: AICompletionOptions): AsyncGenerator<string> {
    const messages = this.buildMessages(options);

    const body = JSON.stringify({
      model: this.config.model,
      messages,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.3,
      stream: true,
    });

    const response = await this.fetchWithTimeout(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body,
    });

    if (!response.ok) {
      throw this.mapHttpError(response.status, await response.text());
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.replace(/^data: /, '').trim();
        if (!trimmed || trimmed === '[DONE]') continue;
        try {
          const chunk = JSON.parse(trimmed) as {
            choices: Array<{ delta?: { content?: string } }>;
          };
          const content = chunk.choices[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // skip malformed SSE lines
        }
      }
    }
  }

  async embed(text: string): Promise<AIEmbeddingResult> {
    const body = JSON.stringify({ model: this.config.model, input: text });

    const response = await this.fetchWithTimeout(`${this.config.baseUrl}/embeddings`, {
      method: 'POST',
      headers: this.headers(),
      body,
    });

    if (!response.ok) {
      throw this.mapHttpError(response.status, await response.text());
    }

    const data = await response.json() as {
      data: Array<{ embedding: number[] }>;
      model?: string;
    };

    return {
      vector: data.data[0]?.embedding ?? [],
      model: data.model,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/models`, {
        method: 'GET',
        headers: this.headers(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private buildMessages(options: AICompletionOptions) {
    return options.messages.map(m => ({ role: m.role, content: m.content }));
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    return headers;
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new AIProviderError('Request timed out after 30s', 'network', this.name, true);
      }
      throw new AIProviderError(String(err), 'network', this.name, true);
    } finally {
      clearTimeout(timer);
    }
  }

  private mapHttpError(status: number, body: string): AIProviderError {
    if (status === 401 || status === 403) {
      return new AIProviderError('Authentication failed', 'auth', this.name);
    }
    if (status === 429) {
      return new AIProviderError('Rate limit exceeded', 'rate_limit', this.name, true);
    }
    return new AIProviderError(`HTTP ${status}: ${body.slice(0, 200)}`, 'unknown', this.name);
  }
}
