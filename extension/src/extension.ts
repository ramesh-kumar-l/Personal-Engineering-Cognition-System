import * as vscode from 'vscode';
import { Logger } from './utils/logger';
import { getWorkspaceId } from './utils/config';
import { StorageManager } from './storage/StorageManager';
import { MemoryStore } from './storage/MemoryStore';
import { SummaryCache } from './storage/SummaryCache';
import { ProviderManager } from './providers/ProviderFactory';
import { EmbeddingService } from './search/EmbeddingService';
import { RepoScanner } from './scanner/RepoScanner';
import { SearchEngine } from './search/SearchEngine';
import { PecsPanel } from './webview/PecsPanel';
import { MemoryLinker } from './memory/MemoryLinker';
import { ProvenanceTracker } from './memory/ProvenanceTracker';
import { StalenessDetector } from './memory/StalenessDetector';
import { registerSummarizeRepo } from './commands/summarizeRepo';
import { registerSearchMemory } from './commands/searchMemory';
import { registerGenerateOnboarding } from './commands/generateOnboarding';
import { registerRecordMemory } from './commands/recordMemory';
import { registerClearCache } from './commands/clearCache';
import { registerExportMemories } from './commands/exportMemories';
import { registerLinkMemory } from './commands/linkMemory';
import { registerViewTimeline } from './commands/viewTimeline';
import { registerCheckStaleness } from './commands/checkStaleness';
import { registerCrossWorkspaceSearch } from './commands/crossWorkspaceSearch';

let logger: Logger | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  logger = new Logger('PECS');
  logger.info('Activating PECS v0.3.0');

  // Storage
  const storageManager = new StorageManager(context);
  await storageManager.load();

  const memoryStore = new MemoryStore(storageManager);
  const summaryCache = new SummaryCache(storageManager);

  // AI provider (lazy instantiation)
  const providerManager = new ProviderManager();

  // Phase 3: embedding service wraps HNSW index + embedding provider
  const embeddingService = new EmbeddingService(providerManager.getEmbeddingProvider());

  // Search engine — uses EmbeddingService for semantic search
  const searchEngine = new SearchEngine(memoryStore, providerManager.provider, embeddingService);

  // Index existing memories on startup (keyword + HNSW from stored embeddings)
  const workspaceId = getWorkspaceId();
  await searchEngine.reindex(workspaceId);

  // Repo scanner
  const scanner = new RepoScanner(providerManager.provider, summaryCache);

  // Phase 2 modules
  const linker = new MemoryLinker(memoryStore);
  const provenanceTracker = new ProvenanceTracker();
  const stalenessDetector = new StalenessDetector();

  // Webview panel
  const panel = new PecsPanel(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(PecsPanel.viewType, panel),

    // Phase 1 commands
    registerSummarizeRepo(scanner, panel),
    registerSearchMemory(searchEngine, panel),
    registerGenerateOnboarding(scanner, providerManager.provider, panel),
    registerRecordMemory(memoryStore, searchEngine, provenanceTracker),
    registerClearCache(summaryCache),

    // Phase 2 commands
    registerExportMemories(memoryStore),
    registerLinkMemory(memoryStore, linker),
    registerViewTimeline(memoryStore, panel),
    registerCheckStaleness(memoryStore, stalenessDetector, panel),

    // Phase 3 commands
    registerCrossWorkspaceSearch(searchEngine, panel),
  );

  // Route webview messages to extension handlers
  panel.onMessage(async (msg) => {
    if (msg.type === 'search') {
      const results = await searchEngine.query(msg.query, workspaceId);
      panel.postMessage({ type: 'searchResults', payload: results });
    }

    if (msg.type === 'openMemoryDetail') {
      const memory = await memoryStore.getById(msg.id);
      if (!memory) return;
      const linkedMemories = await linker.getLinked(msg.id);
      panel.postMessage({
        type: 'memoryDetail',
        payload: {
          memory,
          linkedMemories: linkedMemories.map(l => ({
            id: l.id,
            title: l.title,
            type: l.type,
            createdAt: l.createdAt,
          })),
        },
      });
    }

    if (msg.type === 'linkFromDetail') {
      const memories = await memoryStore.getAll(workspaceId);
      const source = await memoryStore.getById(msg.sourceId);
      if (!source || memories.length < 2) return;

      const toItem = (m: { id: string; title: string; type: string; createdAt: string }) => ({
        label: m.title,
        description: `${m.type} · ${new Date(m.createdAt).toLocaleDateString()}`,
        id: m.id,
      });

      const targetItem = await vscode.window.showQuickPick(
        memories.filter(m => m.id !== msg.sourceId).map(toItem),
        { placeHolder: `Link "${source.title}" to...` }
      );
      if (!targetItem) return;

      await linker.link(msg.sourceId, targetItem.id);
      panel.postMessage({
        type: 'memoryLinked',
        payload: { sourceTitle: source.title, targetTitle: targetItem.label },
      });

      // Refresh detail view
      const updated = await memoryStore.getById(msg.sourceId);
      if (!updated) return;
      const linkedMemories = await linker.getLinked(msg.sourceId);
      panel.postMessage({
        type: 'memoryDetail',
        payload: {
          memory: updated,
          linkedMemories: linkedMemories.map(l => ({
            id: l.id,
            title: l.title,
            type: l.type,
            createdAt: l.createdAt,
          })),
        },
      });
    }
  });

  // Invalidate provider on config changes (also re-creates embedding provider)
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('pecs')) {
        providerManager.invalidate();
        logger?.info('Configuration changed — providers invalidated');
      }
    })
  );

  logger.info('PECS v0.3.0 activated');
}

export async function deactivate(): Promise<void> {
  logger?.info('PECS deactivated');
  logger?.dispose();
}
