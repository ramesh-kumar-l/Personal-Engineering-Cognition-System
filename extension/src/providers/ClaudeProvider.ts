import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AIProviderError, type AICompletionOptions, type AICompletionResult } from './AIProvider';

type ClaudeConfig = {
  apiKey: string;
  model: string;
};

export class ClaudeProvider implements AIProvider {
  readonly name = 'claude';
  private client: Anthropic;

  constructor(private readonly config: ClaudeConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
  }

  async complete(options: AICompletionOptions): Promise<AICompletionResult> {
    const messages = options.messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const systemContent = options.systemPrompt
      ?? options.messages.find(m => m.role === 'system')?.content;

    try {
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: options.maxTokens ?? 4096,
        system: systemContent,
        messages,
      });

      const text = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as { type: 'text'; text: string }).text)
        .join('');

      return {
        text,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model: response.model,
      };
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async *completeStream(options: AICompletionOptions): AsyncGenerator<string> {
    const messages = options.messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const systemContent = options.systemPrompt
      ?? options.messages.find(m => m.role === 'system')?.content;

    try {
      const stream = this.client.messages.stream({
        model: this.config.model,
        max_tokens: options.maxTokens ?? 4096,
        system: systemContent,
        messages,
      });

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          yield event.delta.text;
        }
      }
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  private mapError(err: unknown): AIProviderError {
    if (err instanceof Anthropic.APIError) {
      if (err.status === 401) {
        return new AIProviderError('Invalid API key', 'auth', this.name);
      }
      if (err.status === 429) {
        return new AIProviderError('Rate limit exceeded', 'rate_limit', this.name, true);
      }
      if (err.status === 529) {
        return new AIProviderError('Claude overloaded', 'rate_limit', this.name, true);
      }
      return new AIProviderError(err.message, 'unknown', this.name);
    }
    const message = err instanceof Error ? err.message : String(err);
    return new AIProviderError(message, 'network', this.name, true);
  }
}
