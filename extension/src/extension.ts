import * as vscode from 'vscode';
import { Logger } from './utils/logger';
import { getWorkspaceId } from './utils/config';
import { StorageManager } from './storage/StorageManager';
import { MemoryStore } from './storage/MemoryStore';
import { SummaryCache } from './storage/SummaryCache';
import { ProviderManager } from './providers/ProviderFactory';
import { RepoScanner } from './scanner/RepoScanner';
import { SearchEngine } from './search/SearchEngine';
import { PecsPanel } from './webview/PecsPanel';
import { registerSummarizeRepo } from './commands/summarizeRepo';
import { registerSearchMemory } from './commands/searchMemory';
import { registerGenerateOnboarding } from './commands/generateOnboarding';
import { registerRecordMemory } from './commands/recordMemory';
import { registerClearCache } from './commands/clearCache';

let logger: Logger | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  logger = new Logger('PECS');
  logger.info('Activating PECS v0.1.0');

  // Storage
  const storageManager = new StorageManager(context);
  await storageManager.load();

  const memoryStore = new MemoryStore(storageManager);
  const summaryCache = new SummaryCache(storageManager);

  // AI provider (lazy instantiation)
  const providerManager = new ProviderManager();

  // Search engine
  const searchEngine = new SearchEngine(memoryStore, providerManager.provider);

  // Index existing memories on startup
  const workspaceId = getWorkspaceId();
  await searchEngine.reindex(workspaceId);

  // Repo scanner
  const scanner = new RepoScanner(providerManager.provider, summaryCache);

  // Webview panel
  const panel = new PecsPanel(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(PecsPanel.viewType, panel),

    // Commands
    registerSummarizeRepo(scanner, panel),
    registerSearchMemory(searchEngine, panel),
    registerGenerateOnboarding(scanner, providerManager.provider, panel),
    registerRecordMemory(memoryStore, searchEngine),
    registerClearCache(summaryCache),

    // Handle search queries from webview
    {
      dispose: () => undefined,
    }
  );

  // Route webview messages to search
  panel.onMessage(async (msg) => {
    if (msg.type === 'search') {
      const results = await searchEngine.query(msg.query, workspaceId);
      panel.postMessage({ type: 'searchResults', payload: results });
    }
  });

  // Invalidate provider on config changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('pecs')) {
        providerManager.invalidate();
        logger?.info('Configuration changed — AI provider invalidated');
      }
    })
  );

  logger.info('PECS activated');
}

export async function deactivate(): Promise<void> {
  logger?.info('PECS deactivated');
  logger?.dispose();
}
