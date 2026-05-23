import * as vscode from 'vscode';
import type { MemoryStore } from '../storage/MemoryStore';
import type { PecsPanel } from '../webview/PecsPanel';
import type { TimelineEntry } from '../storage/schema';
import { getWorkspaceId } from '../utils/config';

export function registerViewTimeline(
  memoryStore: MemoryStore,
  panel: PecsPanel
): vscode.Disposable {
  return vscode.commands.registerCommand('pecs.viewTimeline', async () => {
    const workspaceId = getWorkspaceId();
    const memories = await memoryStore.getAll(workspaceId);

    const timeline: TimelineEntry[] = memories
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(m => ({
        id: m.id,
        type: m.type,
        title: m.title,
        createdAt: m.createdAt,
        tags: m.tags,
        filePath: m.filePath,
        stalenessStatus: m.stalenessStatus,
        linkedCount: m.linkedMemoryIds?.length ?? 0,
      }));

    panel.reveal();
    panel.postMessage({ type: 'timeline', payload: timeline });
  });
}
