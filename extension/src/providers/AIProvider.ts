export type AIMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type AICompletionOptions = {
  messages: AIMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
};

export type AICompletionResult = {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
  model?: string;
};

export type AIEmbeddingResult = {
  vector: number[];
  model?: string;
};

export interface AIProvider {
  readonly name: string;
  complete(options: AICompletionOptions): Promise<AICompletionResult>;
  completeStream(options: AICompletionOptions): AsyncGenerator<string>;
  embed?(text: string, options?: { inputType?: 'query' | 'document' }): Promise<AIEmbeddingResult>;
  isAvailable(): Promise<boolean>;
}

export interface EmbeddingProvider {
  readonly name: string;
  embed(text: string, options?: { inputType?: 'query' | 'document' }): Promise<AIEmbeddingResult>;
  isAvailable(): Promise<boolean>;
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly code: 'auth' | 'rate_limit' | 'network' | 'model' | 'unsupported' | 'unknown',
    public readonly provider: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}
