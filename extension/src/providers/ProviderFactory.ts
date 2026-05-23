import * as vscode from 'vscode';
import type { AIProvider } from './AIProvider';
import { ClaudeProvider } from './ClaudeProvider';
import { OpenAICompatProvider } from './OpenAICompatProvider';
import { OllamaProvider } from './OllamaProvider';

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

export class ProviderManager {
  private current: AIProvider | null = null;

  get provider(): AIProvider {
    if (!this.current) {
      this.current = createProvider();
    }
    return this.current;
  }

  invalidate(): void {
    this.current = null;
  }
}
