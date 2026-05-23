import { AIProviderError, type AIEmbeddingResult, type EmbeddingProvider } from './AIProvider';

type VoyageConfig = {
  apiKey: string;
  model: string;
};

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';

export class VoyageProvider implements EmbeddingProvider {
  readonly name = 'voyage';

  constructor(private readonly config: VoyageConfig) {}

  async embed(
    text: string,
    options: { inputType?: 'query' | 'document' } = {}
  ): Promise<AIEmbeddingResult> {
    const response = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: [text],
        model: this.config.model,
        input_type: options.inputType ?? 'document',
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      if (response.status === 401) {
        throw new AIProviderError('Invalid Voyage API key', 'auth', this.name);
      }
      if (response.status === 429) {
        throw new AIProviderError('Voyage API rate limit exceeded', 'rate_limit', this.name, true);
      }
      throw new AIProviderError(
        `Voyage API error: ${response.status} ${errText}`,
        'network',
        this.name,
        response.status >= 500
      );
    }

    const data = await response.json() as {
      data: Array<{ embedding: number[]; index: number }>;
      model: string;
    };

    return {
      vector: data.data[0].embedding,
      model: data.model,
    };
  }

  async isAvailable(): Promise<boolean> {
    return this.config.apiKey.length > 0;
  }
}
