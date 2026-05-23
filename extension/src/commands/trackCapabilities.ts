import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import type { MemoryStore } from '../storage/MemoryStore';
import type { WorkflowStore } from '../storage/WorkflowStore';
import type { CapabilityStore } from '../storage/CapabilityStore';
import type { SummaryCache } from '../storage/SummaryCache';
import { TechnologyTracker } from '../capability/TechnologyTracker';
import { WorkflowMetricsCalculator } from '../capability/WorkflowMetricsCalculator';
import { getWorkspaceId } from '../utils/config';

export function registerTrackCapabilities(
  memoryStore: MemoryStore,
  workflowStore: WorkflowStore,
  capabilityStore: CapabilityStore,
  summaryCache: SummaryCache,
): vscode.Disposable {
  return vscode.commands.registerCommand('pecs.trackCapabilities', async () => {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'PECS: Tracking capabilities…' },
      async () => {
        const workspaceId = getWorkspaceId();

        // Detect technologies from all memories
        const memories = await memoryStore.getAll(workspaceId);
        const fromMemories = TechnologyTracker.detectFromMemories(memories);

        // Detect technologies from cached repo summary (if any)
        const summary = await summaryCache.get(workspaceId);
        const fromSummary = summary
          ? TechnologyTracker.detectFromTechStack(summary.techStack, summary.architecture)
          : [];

        // Merge and upsert all detected technologies
        const allTech = mergeDetected([...fromMemories, ...fromSummary]);
        for (const tech of allTech) {
          await capabilityStore.upsertTechnology(tech.name, tech.category, workspaceId, tech.tags);
        }

        // Compute workflow maturity
        const workflows = await workflowStore.getAll();
        const workflowMaturity = WorkflowMetricsCalculator.compute(workflows);

        // Save snapshot
        const technologies = await capabilityStore.getTechnologies();
        const allWorkspaceIds = [...new Set(technologies.flatMap(t => t.workspaceIds))];
        await capabilityStore.addSnapshot({
          id: uuidv4(),
          capturedAt: new Date().toISOString(),
          technologies,
          workflowMaturity,
          memoryCount: memories.length,
          workspaceIds: allWorkspaceIds,
        });

        vscode.window.showInformationMessage(
          `PECS: Tracked ${technologies.length} technolog${technologies.length !== 1 ? 'ies' : 'y'} from ${memories.length} memories.`,
        );
      },
    );
  });
}

function mergeDetected(
  entries: Array<{ name: string; category: string; tags: string[] }>,
): Array<{ name: string; category: Parameters<CapabilityStore['upsertTechnology']>[1]; tags: string[] }> {
  const seen = new Map<string, { name: string; category: string; tags: string[] }>();
  for (const e of entries) {
    const key = e.name.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, { ...e });
    } else {
      const existing = seen.get(key)!;
      for (const tag of e.tags) {
        if (!existing.tags.includes(tag)) existing.tags.push(tag);
      }
    }
  }
  return Array.from(seen.values()) as Array<{
    name: string;
    category: Parameters<CapabilityStore['upsertTechnology']>[1];
    tags: string[];
  }>;
}
