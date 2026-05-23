import { Ollama } from 'ollama';
import { AIProvider, AIProviderError, type AICompletionOptions, type AICompletionResult, type AIEmbeddingResult } from './AIProvider';

type OllamaConfig = {
  baseUrl: string;
  model: string;
  embeddingModel: string;
};

export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';
  private client: Ollama;

  constructor(private readonly config: OllamaConfig) {
    this.client = new Ollama({ host: config.baseUrl });
  }

  async complete(options: AICompletionOptions): Promise<AICompletionResult> {
    const messages = options.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await this.client.chat({
        model: this.config.model,
        messages,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.3,
          num_predict: options.maxTokens ?? 4096,
        },
      });

      return {
        text: response.message.content,
        model: response.model,
      };
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async *completeStream(options: AICompletionOptions): AsyncGenerator<string> {
    const messages = options.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const stream = await this.client.chat({
        model: this.config.model,
        messages,
        stream: true,
        options: {
          temperature: options.temperature ?? 0.3,
          num_predict: options.maxTokens ?? 4096,
        },
      });

      for await (const chunk of stream) {
        if (chunk.message.content) {
          yield chunk.message.content;
        }
      }
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async embed(text: string): Promise<AIEmbeddingResult> {
    try {
      const response = await this.client.embeddings({
        model: this.config.embeddingModel,
        prompt: text,
      });

      return {
        vector: response.embedding,
        model: this.config.embeddingModel,
      };
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.list();
      return true;
    } catch {
      return false;
    }
  }

  private mapError(err: unknown): AIProviderError {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
      return new AIProviderError(
        `Ollama not running at ${this.config.baseUrl}`,
        'network',
        this.name,
        true
      );
    }
    if (message.includes('model') && message.includes('not found')) {
      return new AIProviderError(
        `Model "${this.config.model}" not found. Run: ollama pull ${this.config.model}`,
        'model',
        this.name
      );
    }
    return new AIProviderError(message, 'unknown', this.name);
  }
}
