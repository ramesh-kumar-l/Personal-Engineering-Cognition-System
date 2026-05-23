import * as vscode from 'vscode';

export function getWorkspaceId(): string {
  const folders = vscode.workspace.workspaceFolders;
  const rootPath = folders?.[0]?.uri.fsPath ?? vscode.workspace.name ?? 'default';
  return Buffer.from(rootPath).toString('base64url').slice(0, 24);
}

export function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

export function generateNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
