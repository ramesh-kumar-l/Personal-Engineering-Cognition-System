import * as vscode from 'vscode';
import * as path from 'path';
import type { MemoryStore } from '../storage/MemoryStore';
import type { Memory } from '../storage/schema';
import { getWorkspaceId } from '../utils/config';

export function registerExportMemories(memoryStore: MemoryStore): vscode.Disposable {
  return vscode.commands.registerCommand('pecs.exportMemories', async () => {
    const workspaceId = getWorkspaceId();
    const memories = await memoryStore.getAll(workspaceId);

    if (memories.length === 0) {
      vscode.window.showInformationMessage('PECS: No memories to export.');
      return;
    }

    const filterPicked = await vscode.window.showQuickPick(
      [
        { label: 'All types', value: null },
        { label: '$(debug-alt) Debug', value: 'debug' },
        { label: '$(lightbulb) Decision', value: 'decision' },
        { label: '$(book) Learning', value: 'learning' },
        { label: '$(warning) Incident', value: 'incident' },
        { label: '$(note) Note', value: 'note' },
      ],
      { placeHolder: 'Filter by memory type' }
    );
    if (!filterPicked) return;

    const filtered = filterPicked.value
      ? memories.filter(m => m.type === filterPicked.value)
      : memories;

    if (filtered.length === 0) {
      vscode.window.showInformationMessage(`PECS: No ${filterPicked.value ?? ''} memories to export.`);
      return;
    }

    const defaultUri = vscode.workspace.workspaceFolders?.[0]?.uri
      ? vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, 'pecs-export.md')
      : undefined;

    const uri = await vscode.window.showSaveDialog({
      defaultUri,
      filters: { Markdown: ['md'] },
      title: 'Save PECS Memory Export',
    });
    if (!uri) return;

    const markdown = buildMarkdown(filtered);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(markdown, 'utf-8'));
    vscode.window.showInformationMessage(
      `PECS: Exported ${filtered.length} memor${filtered.length === 1 ? 'y' : 'ies'} to ${path.basename(uri.fsPath)}`
    );
  });
}

function buildMarkdown(memories: Memory[]): string {
  const lines: string[] = [
    '# PECS Engineering Memory Export',
    '',
    `_Generated: ${new Date().toISOString()}_  `,
    `_Total: ${memories.length} memor${memories.length === 1 ? 'y' : 'ies'}_`,
    '',
    '---',
    '',
  ];

  const byType = new Map<string, Memory[]>();
  for (const m of memories) {
    const group = byType.get(m.type) ?? [];
    group.push(m);
    byType.set(m.type, group);
  }

  const typeOrder = ['incident', 'debug', 'decision', 'learning', 'note'];
  const sorted = typeOrder.filter(t => byType.has(t)).concat(
    [...byType.keys()].filter(t => !typeOrder.includes(t))
  );

  for (const type of sorted) {
    const items = byType.get(type)!.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    lines.push(`## ${capitalize(type)} (${items.length})`);
    lines.push('');

    for (const m of items) {
      lines.push(`### ${m.title}`);
      lines.push('');
      lines.push(`_${new Date(m.createdAt).toLocaleString()}_`);
      lines.push('');

      if (m.tags.length) lines.push(`**Tags:** ${m.tags.join(', ')}`);
      if (m.filePath) {
        const loc = m.lineRange ? ` (lines ${m.lineRange.start + 1}–${m.lineRange.end + 1})` : '';
        lines.push(`**File:** \`${m.filePath}\`${loc}`);
      }
      if (m.commitHash) lines.push(`**Commit:** \`${m.commitHash.slice(0, 8)}\``);
      if (m.stalenessStatus && m.stalenessStatus !== 'unknown') {
        lines.push(`**Staleness:** ${m.stalenessStatus}`);
      }
      if (m.linkedMemoryIds?.length) {
        lines.push(`**Linked memories:** ${m.linkedMemoryIds.length}`);
      }

      lines.push('');
      lines.push(m.content);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  return lines.join('\n');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
