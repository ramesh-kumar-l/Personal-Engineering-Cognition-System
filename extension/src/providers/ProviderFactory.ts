import * as vscode from 'vscode';
import type { AIProvider, EmbeddingProvider } from './AIProvider';
import { ClaudeProvider } from './ClaudeProvider';
import { OpenAICompatProvider } from './OpenAICompatProvider';
import { OllamaProvider } from './OllamaProvider';
import { VoyageProvider } from './VoyageProvider';

function createProvider(): AIProvider {
  const cfg = vscode.workspace.getConfiguration('pecs');
  const providerName = cfg.get<string>('aiProvider', 'claude');

  switch (providerName) {
    case 'claude': {
      const apiKey = cfg.get<string>('claude.apiKey', '') || process.env['ANTHROPIC_API_KEY'] || '';
      const model = cfg.get<string>('claude.model', 'claude-sonnet-4-5');
      return new ClaudeProvider({ apiKey, model });
    }
    case 'openai-compat': {
      const baseUrl = cfg.get<string>('openaiCompat.baseUrl', 'http://localhost:1234/v1');
      const apiKey = cfg.get<string>('openaiCompat.apiKey', '');
      const model = cfg.get<string>('openaiCompat.model', 'gpt-4o');
      return new OpenAICompatProvider({ baseUrl, apiKey, model });
    }
    case 'ollama': {
      const baseUrl = cfg.get<string>('ollama.baseUrl', 'http://localhost:11434');
      const model = cfg.get<string>('ollama.model', 'llama3.2');
      const embeddingModel = cfg.get<string>('ollama.embeddingModel', 'nomic-embed-text');
      return new OllamaProvider({ baseUrl, model, embeddingModel });
    }
    default:
      throw new Error(`Unknown pecs.aiProvider: "${providerName}". Valid values: claude, openai-compat, ollama`);
  }
}

function createEmbeddingProvider(mainProvider: AIProvider): EmbeddingProvider | null {
  const cfg = vscode.workspace.getConfiguration('pecs');
  const voyageApiKey = cfg.get<string>('voyage.apiKey', '');

  // Voyage takes priority — dedicated embedding model for highest quality
  if (voyageApiKey) {
    const model = cfg.get<string>('voyage.model', 'voyage-3-lite');
    return new VoyageProvider({ apiKey: voyageApiKey, model });
  }

  // Fall back to the main provider if it supports embeddings (Ollama, OpenAI-compat)
  if (mainProvider.embed) {
    return {
      name: mainProvider.name,
      embed: (text, opts) => mainProvider.embed!(text, opts),
      isAvailable: () => mainProvider.isAvailable(),
    };
  }

  return null;
}

export class ProviderManager {
  private chatProvider: AIProvider | null = null;
  private embeddingProviderCache: EmbeddingProvider | null | undefined = undefined;

  get provider(): AIProvider {
    if (!this.chatProvider) {
      this.chatProvider = createProvider();
    }
    return this.chatProvider;
  }

  getEmbeddingProvider(): EmbeddingProvider | null {
    if (this.embeddingProviderCache !== undefined) return this.embeddingProviderCache;
    this.embeddingProviderCache = createEmbeddingProvider(this.provider);
    return this.embeddingProviderCache;
  }

  invalidate(): void {
    this.chatProvider = null;
    this.embeddingProviderCache = undefined;
  }
}
