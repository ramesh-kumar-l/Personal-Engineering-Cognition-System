import * as vscode from 'vscode';
import type { MemoryStore } from '../storage/MemoryStore';
import type { SearchEngine } from '../search/SearchEngine';
import type { ProvenanceTracker } from '../memory/ProvenanceTracker';
import type { Memory } from '../storage/schema';
import { getWorkspaceId, getWorkspaceRoot } from '../utils/config';

const MEMORY_TYPES: Array<{ label: string; value: Memory['type']; description: string }> = [
  { label: '$(debug-alt) Debug', value: 'debug', description: 'A debugging session, issue, and resolution' },
  { label: '$(lightbulb) Decision', value: 'decision', description: 'An architectural or design decision' },
  { label: '$(book) Learning', value: 'learning', description: 'A new insight or technique discovered' },
  { label: '$(warning) Incident', value: 'incident', description: 'A production incident and findings' },
  { label: '$(note) Note', value: 'note', description: 'Freeform engineering note' },
];

export function registerRecordMemory(
  memoryStore: MemoryStore,
  searchEngine: SearchEngine,
  provenanceTracker: ProvenanceTracker
): vscode.Disposable {
  return vscode.commands.registerCommand('pecs.recordMemory', async () => {
    const editor = vscode.window.activeTextEditor;
    const selectedText = editor?.document.getText(editor.selection) ?? '';
    const filePath = editor?.document.uri.fsPath;
    const lineRange = editor && !editor.selection.isEmpty
      ? { start: editor.selection.start.line, end: editor.selection.end.line }
      : undefined;

    const picked = await vscode.window.showQuickPick(
      MEMORY_TYPES.map(t => ({ label: t.label, description: t.description, value: t.value })),
      { placeHolder: 'Memory type' }
    );
    if (!picked) return;

    const title = await vscode.window.showInputBox({
      prompt: 'Memory title',
      placeHolder: 'e.g. "Fixed N+1 query in user listings"',
    });
    if (!title) return;

    const content = await vscode.window.showInputBox({
      prompt: 'Details (optional — selected text auto-included)',
      placeHolder: 'Additional context, root cause, solution...',
    });

    const fullContent = [content, selectedText ? `\n\nCode:\n${selectedText}` : '']
      .filter(Boolean)
      .join('');

    const tags: string[] = [];
    if (filePath) {
      const ext = filePath.split('.').pop();
      if (ext) tags.push(ext);
    }

    const workspaceId = getWorkspaceId();
    const workspaceRoot = getWorkspaceRoot();
    const commitHash = workspaceRoot ? provenanceTracker.captureCommitHash(workspaceRoot) : undefined;

    const memory = await memoryStore.add({
      workspaceId,
      type: picked.value,
      title,
      content: fullContent || title,
      tags,
      filePath,
      lineRange,
      commitHash,
    });

    // Generate and store embedding if provider supports it
    const embeddingText = `${title}\n${fullContent}`;
    const embedding = await searchEngine.addMemoryEmbedding(memory.id, embeddingText);
    if (embedding) {
      await memoryStore.update(memory.id, { embedding });
    }

    await searchEngine.reindex(workspaceId);

    vscode.window.showInformationMessage(`PECS: Memory recorded — "${title}"`);
  });
}
